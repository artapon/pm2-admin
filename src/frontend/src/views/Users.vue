<template>
  <MainAppBar title="Users" icon="mdi-account-group-outline" :titleIconSize="20" @refresh="loadUsers" />

  <v-main class="page-content">
    <v-container fluid class="pa-4">

      <!-- Users table -->
      <v-card class="page-card fade-in" elevation="0" :loading="loading">
        <template v-slot:loader="{ isActive }">
          <v-progress-linear :active="isActive" color="primary" height="2" indeterminate />
        </template>
        <div class="card-header">
          <span class="card-title">
            <v-icon size="15" color="primary">mdi-account-group-outline</v-icon>
            Registered Users
            <v-chip size="x-small" color="primary" variant="tonal" class="ml-1">{{ users.length }}</v-chip>
          </span>
          <v-spacer />
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search..."
            single-line hide-details variant="outlined" density="compact"
            class="search-field mr-3" style="max-width:200px"
          />
          <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" class="btn-primary-header" @click="openAdd">
            Add User
          </v-btn>
        </div>
        <v-divider class="card-divider" />
        <v-data-table
          :headers="headers" :items="users" :search="search"
          class="data-table" hover density="comfortable"
        >
          <template v-slot:item.role="{ item }">
            <v-chip :color="roleColor(item.role)" variant="flat" size="small" class="font-weight-bold">
              <v-icon start size="13">{{ roleIcon(item.role) }}</v-icon>
              {{ item.role }}
            </v-chip>
          </template>
          <template v-slot:item.created_at="{ item }">
            <span class="text-caption text-secondary">{{ formatDate(item.created_at) }}</span>
          </template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex justify-end gap-1">
              <!-- Change password: own account only -->
              <v-btn
                v-if="authStore.username === item.username"
                prepend-icon="mdi-lock-reset"
                variant="tonal"
                color="warning"
                size="small"
                class="action-btn"
                @click="openChangePassword(item)"
              >
                Password
              </v-btn>
              <!-- Edit: not own account -->
              <v-btn
                v-if="authStore.username !== item.username"
                prepend-icon="mdi-pencil-outline"
                variant="tonal"
                color="primary"
                size="small"
                class="action-btn"
                @click="editUser(item)"
              >
                Edit
              </v-btn>
              <!-- Delete: not own account AND not first root user -->
              <v-btn
                v-if="authStore.username !== item.username && item.id !== firstRootId"
                prepend-icon="mdi-delete-outline"
                variant="tonal"
                color="error"
                size="small"
                class="action-btn"
                @click="openDelete(item)"
              >
                Delete
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card>

    </v-container>
  </v-main>

  <!-- Add / Edit dialog -->
  <v-dialog v-model="userDialog" max-width="460">
    <v-card class="dialog-card">
      <div class="dialog-title">
        <v-icon :color="isEditing ? 'primary' : 'success'" size="18">{{ isEditing ? 'mdi-account-edit-outline' : 'mdi-account-plus-outline' }}</v-icon>
        {{ isEditing ? 'Edit User' : 'Add New User' }}
      </div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5">
        <v-form ref="userForm" v-model="formValid">
          <div class="field-label mb-1">Username</div>
          <v-text-field
            v-model="editedUser.username"
            variant="outlined" density="compact" class="mb-3"
            :rules="[v => !!v || 'Required']"
            :disabled="isEditing"
          />
          <div class="field-label mb-1">Password{{ isEditing ? ' (leave blank to keep)' : '' }}</div>
          <v-text-field
            v-model="editedUser.password"
            variant="outlined" density="compact" type="password" class="mb-3"
            :rules="isEditing ? [] : [v => !!v || 'Required']"
          />
          <div class="field-label mb-1">Role</div>
          <v-select
            v-model="editedUser.role"
            :items="roles" variant="outlined" density="compact"
            :rules="[v => !!v || 'Required']"
          />
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-5 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" @click="userDialog=false">Cancel</v-btn>
        <v-btn variant="flat" color="primary" :prepend-icon="isEditing ? 'mdi-content-save-outline' : 'mdi-plus'" class="btn-confirm" @click="saveUser" :loading="saving" :disabled="!formValid">
          {{ isEditing ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Change Password dialog -->
  <v-dialog v-model="passwordDialog" max-width="420">
    <v-card class="dialog-card">
      <div class="dialog-title">
        <v-icon color="warning" size="18">mdi-lock-reset</v-icon>
        Change Password
      </div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5">
        <v-form ref="passwordForm" v-model="passwordFormValid">
          <div class="field-label mb-1">Current Password</div>
          <v-text-field
            v-model="passwordData.current"
            variant="outlined" density="compact" type="password" class="mb-3"
            :rules="[v => !!v || 'Required']"
          />
          <div class="field-label mb-1">New Password</div>
          <v-text-field
            v-model="passwordData.newPass"
            variant="outlined" density="compact" type="password" class="mb-3"
            :rules="[v => !!v || 'Required', v => v.length >= 6 || 'Minimum 6 characters']"
          />
          <div class="field-label mb-1">Confirm New Password</div>
          <v-text-field
            v-model="passwordData.confirm"
            variant="outlined" density="compact" type="password"
            :rules="[v => !!v || 'Required', v => v === passwordData.newPass || 'Passwords do not match']"
          />
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-5 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" @click="passwordDialog=false">Cancel</v-btn>
        <v-btn variant="flat" color="warning" prepend-icon="mdi-lock-reset" class="btn-confirm" @click="savePassword" :loading="saving" :disabled="!passwordFormValid">
          Change Password
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete dialog -->
  <v-dialog v-model="deleteDialog" max-width="380">
    <v-card class="dialog-card">
      <div class="dialog-title"><v-icon color="error" size="18">mdi-delete-outline</v-icon> Confirm Delete</div>
      <v-divider class="card-divider" />
      <v-card-text class="pa-5 text-body-2">
        Delete user <strong>{{ userToDelete?.username }}</strong>? This action cannot be undone.
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" class="btn-cancel" @click="deleteDialog=false">Cancel</v-btn>
        <v-btn variant="flat" color="error" prepend-icon="mdi-delete-outline" class="btn-confirm" :loading="saving" @click="deleteUser">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useAlert } from '../composables/useAlert'
import api from '../services/api'
import MainAppBar from '../components/MainAppBar.vue'

const authStore = useAuthStore()
const { showAlert } = useAlert()

const loading = ref(false)
const saving = ref(false)
const search = ref('')
const users = ref([])

const userDialog = ref(false)
const deleteDialog = ref(false)
const passwordDialog = ref(false)
const isEditing = ref(false)
const formValid = ref(false)
const passwordFormValid = ref(false)
const userForm = ref(null)
const passwordForm = ref(null)
const userToDelete = ref(null)
const passwordTargetId = ref(null)

const editedUser = ref({ id: null, username: '', password: '', role: 'user' })
const passwordData = ref({ current: '', newPass: '', confirm: '' })
const roles = ['root', 'user']

const headers = [
  { title: 'ID', key: 'id', width: '70px' },
  { title: 'Username', key: 'username' },
  { title: 'Role', key: 'role', width: '120px' },
  { title: 'Created', key: 'created_at', width: '180px' },
  { title: '', key: 'actions', sortable: false, width: '220px', align: 'end' }
]

// User ID 1 is protected from deletion
const firstRootId = 1

const loadUsers = async () => {
  loading.value = true
  try {
    const res = await api.getUsers()
    if (res.data.success) users.value = res.data.data
  } catch { showAlert('Failed to load users', 'error') }
  finally { loading.value = false }
}

const openAdd = () => {
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
    const res = isEditing.value
      ? await api.updateUser(editedUser.value.id, editedUser.value)
      : await api.createUser(editedUser.value)
    if (res.data.success) {
      showAlert(isEditing.value ? 'User updated successfully' : 'User created successfully', 'success')
      userDialog.value = false
      loadUsers()
    }
  } catch (e) {
    showAlert(e.response?.data?.error || 'Operation failed', 'error')
  } finally { saving.value = false }
}

const openChangePassword = (user) => {
  passwordTargetId.value = user.id
  passwordData.value = { current: '', newPass: '', confirm: '' }
  passwordDialog.value = true
}

const savePassword = async () => {
  if (!passwordFormValid.value) return
  saving.value = true
  try {
    const res = await api.changePassword(passwordTargetId.value, passwordData.value.current, passwordData.value.newPass)
    if (res.data.success) {
      showAlert('Password changed successfully', 'success')
      passwordDialog.value = false
    }
  } catch (e) {
    showAlert(e.response?.data?.error || 'Failed to change password', 'error')
  } finally { saving.value = false }
}

const openDelete = (user) => { userToDelete.value = user; deleteDialog.value = true }
const deleteUser = async () => {
  saving.value = true
  try {
    const res = await api.deleteUser(userToDelete.value.id)
    if (res.data.success) {
      showAlert('User deleted successfully', 'success')
      deleteDialog.value = false
      loadUsers()
    }
  } catch { showAlert('Failed to delete user', 'error') }
  finally { saving.value = false }
}

const roleColor = (r) => ({ root: 'orange-darken-2', user: 'primary' }[r] || 'grey')
const roleIcon  = (r) => ({ root: 'mdi-account-supervisor', user: 'mdi-account' }[r] || 'mdi-account')
const formatDate = (d) => d ? new Date(d).toLocaleString() : 'N/A'

onMounted(loadUsers)
</script>

<style scoped>
.field-label { font-size:.78rem; font-weight:500; color:#94a3b8; }
.text-secondary { color:#94a3b8; }
</style>
