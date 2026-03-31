<template>
  <MainAppBar 
    title="User Management" 
    icon="mdi-account-group" 
    :titleIconSize="24" 
    showBack 
    @refresh="loadUsers" 
  />

  <v-main class="main-content">
    <v-container fluid class="pa-6">
      <v-row class="mb-4">
        <v-col cols="12" class="d-flex justify-end">
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-account-plus"
            @click="openAddDialog"
            class="action-btn"
          >
            Add User
          </v-btn>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-card class="users-card glass-card" elevation="0" :loading="loading">
            <template v-slot:loader="{ isActive }">
              <v-progress-linear
                :active="isActive"
                color="primary"
                height="4"
                indeterminate
              ></v-progress-linear>
            </template>
            <v-card-title class="pa-5 d-flex align-center">
              <span class="text-h6 font-weight-bold">Registered Users</span>
              <v-spacer></v-spacer>
              <v-text-field
                v-model="search"
                prepend-inner-icon="mdi-magnify"
                label="Search users..."
                single-line
                hide-details
                variant="outlined"
                density="compact"
                class="search-field"
                style="max-width: 300px;"
              ></v-text-field>
            </v-card-title>
            
            <v-data-table
              :headers="headers"
              :items="users"
              :search="search"
              class="modern-table"
              hover
            >
              <template v-slot:item.role="{ item }">
                <v-chip
                  :color="getRoleColor(item.role)"
                  variant="flat"
                  size="small"
                  class="font-weight-bold"
                >
                  <v-icon start size="14">{{ getRoleIcon(item.role) }}</v-icon>
                  {{ item.role }}
                </v-chip>
              </template>
              
              <template v-slot:item.created_at="{ item }">
                <span class="text-caption">{{ formatDate(item.created_at) }}</span>
              </template>
              
              <template v-slot:item.actions="{ item }">
                <div class="d-flex justify-end">
                  <v-btn
                    icon="mdi-pencil-outline"
                    variant="text"
                    color="primary"
                    size="small"
                    @click="editUser(item)"
                    :disabled="authStore.username === item.username"
                  ></v-btn>
                  <v-btn
                    icon="mdi-delete-outline"
                    variant="text"
                    color="error"
                    size="small"
                    @click="confirmDelete(item)"
                    :disabled="authStore.username === item.username"
                  ></v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="userDialog" max-width="500">
      <v-card class="glass-card">
        <v-card-title class="pa-5 pb-3 d-flex align-center">
          <v-icon class="mr-3" color="primary">{{ isEditing ? 'mdi-account-edit' : 'mdi-account-plus' }}</v-icon>
          <span class="text-subtitle-1 font-weight-bold">{{ isEditing ? 'Edit User' : 'Add New User' }}</span>
        </v-card-title>
        
        <v-card-text class="pa-6">
          <v-form ref="userForm" v-model="formValid">
            <v-text-field
              v-model="editedUser.username"
              label="Username"
              variant="outlined"
              density="comfortable"
              class="mb-4"
              :rules="[v => !!v || 'Username is required']"
              :disabled="isEditing"
            ></v-text-field>
            
            <v-text-field
              v-model="editedUser.password"
              label="Password"
              variant="outlined"
              density="comfortable"
              type="password"
              class="mb-4"
              :placeholder="isEditing ? '(leave blank to keep current)' : ''"
              :rules="isEditing ? [] : [v => !!v || 'Password is required']"
            ></v-text-field>
            
            <v-select
              v-model="editedUser.role"
              :items="roles"
              label="Role"
              variant="outlined"
              density="comfortable"
              class="mb-2"
              :rules="[v => !!v || 'Role is required']"
            ></v-select>
          </v-form>
        </v-card-text>
        
        <v-card-actions class="pa-6 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" color="grey" @click="userDialog = false">Cancel</v-btn>
          <v-btn 
            variant="flat" 
            color="primary" 
            @click="saveUser"
            :loading="saving"
            :disabled="!formValid"
          >
            {{ isEditing ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card class="glass-card">
        <v-card-title class="pa-5 pb-3 d-flex align-center">
          <v-icon class="mr-2" color="error">mdi-delete-alert</v-icon>
          Confirm Delete
        </v-card-title>
        <v-card-text class="pa-6 text-center">
          <v-icon size="48" color="error" class="mb-4">mdi-alert-circle-outline</v-icon>
          <div class="text-h6">Delete User?</div>
          <div class="text-body-2 text-medium-emphasis mt-2">
            Are you sure you want to delete <strong>{{ userToDelete?.username }}</strong>?
          </div>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" color="grey" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn variant="flat" color="error" @click="deleteUser" :loading="saving">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top">
      {{ snackbar.text }}
    </v-snackbar>
  </v-main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const users = ref([])

const userDialog = ref(false)
const deleteDialog = ref(false)
const isEditing = ref(false)
const formValid = ref(false)
const userForm = ref(null)

const editedUser = ref({
  id: null,
  username: '',
  password: '',
  role: 'user'
})

const userToDelete = ref(null)

const roles = ['root', 'user']

const headers = [
  { title: 'ID', key: 'id' },
  { title: 'Username', key: 'username' },
  { title: 'Role', key: 'role' },
  { title: 'Created At', key: 'created_at' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
]

const snackbar = ref({
  show: false,
  color: 'success',
  text: ''
})

const showMessage = (text, color = 'success') => {
  snackbar.value.text = text
  snackbar.value.color = color
  snackbar.value.show = true
}

const loadUsers = async () => {
  loading.value = true
  try {
    const response = await api.getUsers()
    if (response.data.success) {
      users.value = response.data.data
    }
  } catch (error) {
    showMessage('Failed to load users', 'error')
  } finally {
    loading.value = false
  }
}

const openAddDialog = () => {
  isEditing.value = false
  editedUser.value = { id: null, username: '', password: '', role: 'user' }
  userDialog.value = true
}

const editUser = (user) => {
  isEditing.value = true
  editedUser.value = { ...user, password: '' }
  userDialog.value = true
}

const saveUser = async () => {
  if (!formValid.value) return
  
  saving.value = true
  try {
    let response
    if (isEditing.value) {
      response = await api.updateUser(editedUser.value.id, editedUser.value)
    } else {
      response = await api.createUser(editedUser.value)
    }
    
    if (response.data.success) {
      showMessage(isEditing.value ? 'User updated successfully' : 'User created successfully')
      userDialog.value = false
      loadUsers()
    }
  } catch (error) {
    showMessage(error.response?.data?.error || 'Operation failed', 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (user) => {
  userToDelete.value = user
  deleteDialog.value = true
}

const deleteUser = async () => {
  saving.value = true
  try {
    const response = await api.deleteUser(userToDelete.value.id)
    if (response.data.success) {
      showMessage('User deleted successfully')
      deleteDialog.value = false
      loadUsers()
    }
  } catch (error) {
    showMessage('Failed to delete user', 'error')
  } finally {
    saving.value = false
  }
}

const getRoleColor = (role) => {
  switch (role) {
    case 'root': return 'orange-darken-2'
    default: return 'primary'
  }
}

const getRoleIcon = (role) => {
  switch (role) {
    case 'root': return 'mdi-account-supervisor'
    default: return 'mdi-account'
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

onMounted(loadUsers)
</script>

<style scoped>
.main-content {
  background: #0d0d14;
  min-height: 100vh;
}

.users-card {
  background: #13131f !important;
  border: 1px solid rgba(255, 255, 255, 0.07) !important;
  border-radius: 10px !important;
}

.search-field :deep(.v-field) {
  transition: border-color 0.2s ease;
}

.search-field :deep(.v-field:hover) {
  border-color: rgba(99, 102, 241, 0.4);
}

.modern-table :deep(thead tr) {
  background: rgba(255, 255, 255, 0.025);
}

.modern-table :deep(th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.7rem !important;
  letter-spacing: 0.06em;
  color: #64748b !important;
}

.modern-table :deep(tbody tr:hover td) {
  background-color: rgba(99, 102, 241, 0.05) !important;
}

.action-btn {
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0;
}

.glass-card {
  background: #13131f !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
}
</style>
