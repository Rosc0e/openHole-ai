<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps(['id', 'data'])
const emit = defineEmits(['update:data'])

const md = new MarkdownIt()

const renderedAiText = computed(() => {
  return md.render(props.data.aiText || '')
})

function onUserTextChange(e: Event) {
  const target = e.target as HTMLTextAreaElement
  // We should probably emit an event to the store to update the node data
  // But for now, let's assume the parent handles it or we mutate data directly (Vue Flow data is reactive)
  props.data.userText = target.value
}
</script>

<template>
  <div class="chat-pair-node bg-gray-900 border border-gray-700 rounded-lg w-[400px] overflow-hidden shadow-lg text-white">
    <Handle type="target" :position="Position.Top" />
    
    <!-- User Header -->
    <div class="bg-gray-800 p-3 border-b border-gray-700">
      <textarea 
        class="w-full bg-transparent text-gray-200 resize-none outline-none"
        v-model="data.userText"
        placeholder="Type your message..."
        rows="2"
      ></textarea>
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
