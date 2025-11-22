<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  x: number
  y: number
}>()

const emit = defineEmits(['close', 'create-node'])

function close() {
  emit('close')
}

function createNode() {
  emit('create-node')
  close()
}
</script>

<template>
  <div 
    class="fixed z-50 bg-gray-800 border border-gray-700 rounded shadow-lg py-1 min-w-[150px]"
    :style="{ top: `${y}px`, left: `${x}px` }"
  >
    <button 
      @click="createNode"
      class="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors cursor-pointer"
    >
      Create New Node
    </button>
  </div>
</template>
