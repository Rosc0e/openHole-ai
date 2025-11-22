<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useGraphStore } from '~/stores/graph'
import ChatPair from './ChatPair.vue'
import SettingsModal from '~/components/SettingsModal.vue'
import { ref, computed, watch, onMounted, markRaw } from 'vue'
import { useDebounceFn } from '@vueuse/core'

const store = useGraphStore()
const vueFlowInstance = ref<any>(null)
const isSettingsOpen = ref(false)

const nodeTypes = {
  chatPair: markRaw(ChatPair)
}

onMounted(() => {
  if (store.nodes.length === 0) {
    store.addNode({
      id: '1',
      type: 'chatPair',
      position: { x: 250, y: 5 },
      data: { userText: '', aiText: '' }
    })
  }
})

function onInit(instance: any) {
  vueFlowInstance.value = instance
}

const activeNode = computed(() => {
  return store.nodes.find(n => n.id === store.activeNodeId)
})

// Auto-save
const debouncedSync = useDebounceFn(() => {
  store.syncGraph()
}, 5000)

watch(
  [() => store.nodes, () => store.edges, () => store.systemPrompt],
  () => {
    debouncedSync()
  },
  { deep: true }
)

function onGlobalInput(e: Event) {
  if (!store.activeNodeId) return
  const target = e.target as HTMLTextAreaElement
  store.updateNodeUserText(store.activeNodeId, target.value)
}

function generate() {
  if (store.activeNodeId) {
    store.generateAIResponse(store.activeNodeId)
  }
}

function createNewGraph() {
  if (confirm('Are you sure? This will clear the current graph.')) {
    store.nodes = []
    store.edges = []
    store.activeNodeId = null
    // Add initial node
    store.addNode({
      id: '1',
      type: 'chatPair',
      position: { x: 250, y: 5 },
      data: { userText: '', aiText: '' }
    })
  }
}

function onPaneDblClick(event: MouseEvent) {
  if (!vueFlowInstance.value) return
  const { x, y } = vueFlowInstance.value.project({ x: event.clientX, y: event.clientY })
  
  store.addNode({
    id: crypto.randomUUID(),
    type: 'chatPair',
    position: { x: x - 200, y: y - 50 }, // Center the node roughly
    data: { userText: '', aiText: '' }
  })
}
</script>

<template>
  <div class="h-screen w-screen flex overflow-hidden bg-gray-950 text-white">
    <!-- Sidebar -->
    <div class="w-16 flex flex-col items-center py-4 border-r border-gray-800 bg-gray-900 z-10">
      <div class="mb-6 font-bold text-xl text-blue-500">RN</div>
      
      <button @click="createNewGraph" class="p-2 mb-4 rounded hover:bg-gray-800 text-gray-400 hover:text-white" title="New Graph">
        <span class="text-xl">+</span>
      </button>

      <button 
        @click="store.syncGraph()" 
        class="p-2 mb-4 rounded hover:bg-gray-800 text-gray-400 hover:text-white relative" 
        :title="store.isSyncing ? 'Syncing...' : 'Sync Now'"
      >
        <span class="text-xl">☁️</span>
        <span v-if="store.isSyncing" class="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
      </button>

      <div class="flex-grow"></div>

      <button @click="isSettingsOpen = true" class="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white" title="Settings">
        <span class="text-xl">⚙️</span>
      </button>
    </div>

    <!-- Main Area -->
    <div class="flex-grow relative h-full w-full" style="height: 100vh; width: 100vw;">
      <div class="absolute inset-0" style="height: 100%; width: 100%;">
        <VueFlow
          v-model:nodes="store.nodes"
          v-model:edges="store.edges"
          :node-types="nodeTypes"
          :snap-to-grid="true"
          :snap-grid="[20, 20]"
          class="rabbit-flow"
          style="height: 100%; width: 100%;"
          @init="onInit"
          @node-click="(e) => store.setActiveNode(e.node.id)"
          @pane-click="store.setActiveNode(null)"
          @pane-dbl-click="onPaneDblClick"
        >
          <Background pattern-color="#334155" :gap="20" />
          <Controls />
        </VueFlow>
      </div>

      <!-- Global Input Bar -->
      <div class="absolute bottom-0 left-0 right-0 p-4 bg-gray-900/90 backdrop-blur border-t border-gray-800 transition-transform duration-300"
           :class="{ 'translate-y-full': !store.activeNodeId }">
        <div class="max-w-4xl mx-auto flex gap-4 items-end">
          <div class="flex-grow relative">
            <textarea
              v-if="activeNode"
              :value="activeNode.data.userText"
              @input="onGlobalInput"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none resize-none"
              placeholder="Type your message here..."
              rows="2"
              @keydown.enter.ctrl.exact="generate"
            ></textarea>
            <div v-else class="text-gray-500 p-3">Select a node to start typing...</div>
          </div>
          <button 
            @click="generate"
            :disabled="!store.activeNodeId"
            class="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>

    <SettingsModal :is-open="isSettingsOpen" @close="isSettingsOpen = false" />
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

.rabbit-flow {
  background-color: #0f172a; /* gray-950 */
  height: 100% !important;
  width: 100% !important;
}
</style>
