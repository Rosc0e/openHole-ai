<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { computed, ref, onMounted, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import { fromHighlighter } from '@shikijs/markdown-it/core'
import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
import { useGraphStore } from '~/stores/graph'
import { useDebounceFn } from '@vueuse/core'

const props = defineProps(['id', 'data', 'selected'])
const store = useGraphStore()

const md = ref<MarkdownIt | null>(null)
const renderedContent = ref('')
const localUserText = ref(props.data.userText)

watch(() => props.data.userText, (newVal) => {
  if (newVal !== localUserText.value) {
    localUserText.value = newVal
  }
})

const debouncedUpdate = useDebounceFn((text: string) => {
  store.updateNodeUserText(props.id, text)
}, 300)

function onUserTextChange(e: Event) {
  const target = e.target as HTMLTextAreaElement
  localUserText.value = target.value
  debouncedUpdate(target.value)
}
</script>

<template>
  <div 
    class="chat-pair-node bg-gray-900 border rounded-lg w-[400px] overflow-hidden shadow-lg text-white transition-colors duration-200"
    :class="selected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700'"
  >
    <Handle type="target" :position="Position.Top" />
    
    <!-- User Header -->
    <div class="bg-gray-800 p-3 border-b border-gray-700">
      <textarea 
        class="w-full bg-transparent text-gray-200 resize-none outline-none"
        v-model="localUserText"
        @input="onUserTextChange"
        placeholder="Type your message..."
        rows="2"
      ></textarea>
    </div>

    <!-- AI Body -->
    <div class="bg-gray-900 p-4 min-h-[100px]">
      <div v-if="data.aiText" v-html="renderedContent" class="prose prose-invert max-w-none text-sm"></div>
      <div v-else class="text-gray-500 italic text-sm">AI is thinking...</div>
    </div>

    <!-- Metadata -->
    <div class="bg-gray-950 px-3 py-1 text-xs text-gray-500 flex justify-between">
      <span>{{ data.model || 'GPT-4' }}</span>
      <span>{{ data.tokens || 0 }} tokens</span>
    </div>

    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style>
/* Shiki styles */
.shiki {
  background-color: #121212 !important;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}
</style>
