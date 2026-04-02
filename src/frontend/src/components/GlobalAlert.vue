<template>
  <Teleport to="body">
    <Transition name="alert-drop">
      <div v-if="alertState.show" class="global-alert-wrapper">
        <v-alert
          :type="alertState.type"
          variant="tonal"
          closable
          density="compact"
          class="global-alert"
          @click:close="closeAlert"
        >
          {{ alertState.text }}
        </v-alert>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useAlert } from '../composables/useAlert'
const { alertState, closeAlert } = useAlert()
</script>

<style>
.global-alert-wrapper {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  height: 52px;
  display: flex;
  align-items: center;
  width: min(480px, calc(100vw - 32px));
  pointer-events: all;
}

.global-alert {
  width: 100%;
  border-radius: 6px !important;
  font-size: 0.82rem !important;
  box-shadow: none !important;
}

.alert-drop-enter-active,
.alert-drop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.alert-drop-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

.alert-drop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}
</style>
