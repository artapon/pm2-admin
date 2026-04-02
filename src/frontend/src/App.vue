<template>
  <v-app>
    <GlobalAlert />
    <NavSidebar v-if="showSidebar" />
    <router-view></router-view>
  </v-app>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import NavSidebar from './components/NavSidebar.vue'
import GlobalAlert from './components/GlobalAlert.vue'

const route = useRoute()

const showSidebar = computed(() => {
  return !['Login', 'Setup'].includes(route.name)
})
</script>
