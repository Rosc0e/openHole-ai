<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import { useGraphStore } from '~/stores/graph'

const props = defineProps(['id', 'data'])
const store = useGraphStore()

const md = new MarkdownIt()

const renderedAiText = computed(() => {
  return md.render(props.data.aiText || '')
})

function onUserTextChange(e: Event) {
  const target = e.target as HTMLTextAreaElement
  store.updateNodeUserText(props.id, target.value)
}

function generate() {
  store.generateAIResponse(props.id)
}
</script>

<template>
  <div class="chat-pair-node bg-gray-900 border border-gray-700 rounded-lg w-[400px] overflow-hidden shadow-lg text-white">
    <Handle type="target" :position="Position.Top" />
    
    <!-- User Header -->
    <div class="bg-gray-800 p-3 border-b border-gray-700 flex flex-col gap-2">
      <textarea 
        class="w-full bg-transparent text-gray-200 resize-none outline-none"
        :value="data.userText"
        @input="onUserTextChange"
        placeholder="Type your message..."
        rows="2"
      ></textarea>
      <button @click="generate" class="self-end text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-500">
        Send
      </button>
    </div>

    <!-- AI Body -->
    <div class="bg-gray-900 p-4 min-h-[100px]">
      <div v-if="data.aiText" v-html="renderedAiText" class="prose prose-invert max-w-none"></div>
      <div v-else class="text-gray-500 italic">AI is thinking...</div>
    </div>

    <!-- Metadata -->
    <div class="bg-gray-950 px-3 py-1 text-xs text-gray-500 flex justify-between">
      <span>{{ data.model || 'GPT-4' }}</span>
      <span>{{ data.tokens || 0 }} tokens</span>
    </div>

    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>
