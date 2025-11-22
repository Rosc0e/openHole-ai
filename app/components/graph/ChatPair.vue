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

async function initMarkdown() {
  try {
    // Temporary fix for document.adoptedStyleSheets error
    // We'll use basic markdown-it for now if shiki fails or just try/catch the whole thing
    md.value = MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    })

    try {
      const highlighter = await createHighlighterCore({
        themes: [import('shiki/themes/github-dark.mjs')],
        langs: [
          import('shiki/langs/javascript.mjs'),
          import('shiki/langs/typescript.mjs'),
          import('shiki/langs/python.mjs'),
          import('shiki/langs/json.mjs'),
          import('shiki/langs/html.mjs'),
          import('shiki/langs/css.mjs'),
          import('shiki/langs/vue.mjs'),
          import('shiki/langs/bash.mjs')
        ],
        engine: createOnigurumaEngine(import('shiki/wasm'))
      })

      md.value.use(fromHighlighter(highlighter, {
        theme: 'github-dark'
      }))
    } catch (innerE) {
      console.warn('Shiki highlighter failed to load, falling back to basic markdown', innerE)
    }
  } catch (e) {
    console.error('Failed to init markdown', e)
    md.value = MarkdownIt()
  }
  updateContent()
}

function updateContent() {
  if (!md.value) return
  if (props.data.aiText) {
    renderedContent.value = md.value.render(props.data.aiText)
  } else {
    renderedContent.value = ''
  }
}

watch(() => props.data.aiText, updateContent)

onMounted(() => {
  initMarkdown()
})
</script>

<template>
  <div 
    class="chat-pair-node bg-gray-900 border rounded-xl w-[450px] overflow-hidden shadow-2xl transition-all duration-200 group"
    :class="selected ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-blue-900/20' : 'border-gray-700 hover:border-gray-600'"
  >
    <Handle type="target" :position="Position.Left" class="!bg-blue-500 !w-3 !h-3 !-left-1.5" />
    
    <!-- User Header -->
    <div class="bg-gray-800 p-4 border-b border-gray-700">
      <div class="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">User</div>
      <textarea 
        class="w-full bg-transparent text-gray-100 resize-none outline-none placeholder-gray-600 text-sm leading-relaxed"
        v-model="localUserText"
        @input="onUserTextChange"
        placeholder="Type your message..."
        rows="2"
      ></textarea>
    </div>

    <!-- AI Body -->
    <div class="bg-gray-900 p-4 min-h-[100px]">
      <div class="text-xs font-semibold text-purple-400 mb-2 uppercase tracking-wider">Assistant</div>
      <div v-if="data.aiText" v-html="renderedContent" class="prose prose-invert prose-sm max-w-none"></div>
      <div v-else class="text-gray-600 italic text-sm flex items-center gap-2">
        <span class="w-2 h-2 bg-gray-600 rounded-full animate-pulse"></span>
        Waiting for input...
      </div>
    </div>

    <!-- Metadata -->
    <div class="bg-gray-950 px-4 py-2 text-[10px] text-gray-500 flex justify-between items-center border-t border-gray-800">
      <span class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        {{ data.model || 'GPT-4' }}
      </span>
      <span class="font-mono">{{ data.tokens || 0 }} tokens</span>
    </div>

    <Handle type="source" :position="Position.Right" class="!bg-purple-500 !w-3 !h-3 !-right-1.5" />
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
