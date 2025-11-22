<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { computed, ref, onMounted, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import { fromHighlighter } from '@shikijs/markdown-it/core'
import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
import { useGraphStore } from '~/stores/graph'
import { useDebounceFn, onClickOutside } from '@vueuse/core'

const props = defineProps(['id', 'data', 'selected'])
const store = useGraphStore()

const md = ref<MarkdownIt | null>(null)
const renderedContent = ref('')
const localUserText = ref(props.data.userText)
const isSettingsOpen = ref(false)
const settingsRef = ref(null)

onClickOutside(settingsRef, () => {
  isSettingsOpen.value = false
})

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
    
    <!-- Metadata -->
    <div class="bg-gray-950 px-4 py-2 text-[10px] text-gray-500 flex justify-between items-center border-b border-gray-800 relative">
      <span class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full" :class="data.preferredModel ? 'bg-blue-500' : 'bg-green-500'"></span>
        {{ data.model || 'Pending...' }}
      </span>
      
      <div class="flex items-center gap-3">
        <span class="font-mono">{{ data.tokens || 0 }} tokens</span>
        <button 
          @click.stop="isSettingsOpen = !isSettingsOpen" 
          class="hover:text-white transition-colors"
          :class="isSettingsOpen ? 'text-blue-400' : ''"
          title="Node Settings"
        >
          ⚙️
        </button>
      </div>

      <!-- Node Settings Popover -->
      <div ref="settingsRef" v-if="isSettingsOpen" class="absolute top-full right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 z-50" @click.stop>
        <div class="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Node Model</div>
        
        <div v-if="store.aiProvider === 'local' && store.availableModels.length > 0" class="mb-2">
          <select 
            :value="data.preferredModel || ''"
            @change="(e) => store.updateNodePreferredModel(id, (e.target as HTMLSelectElement).value || null)"
            class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs text-white outline-none focus:border-blue-500"
          >
            <option value="">Use Global Default</option>
            <option v-for="model in store.availableModels" :key="model" :value="model">
              {{ model }}
            </option>
          </select>
        </div>
        <div v-else class="mb-2">
          <input 
            type="text" 
            :value="data.preferredModel || ''"
            @input="(e) => store.updateNodePreferredModel(id, (e.target as HTMLInputElement).value || null)"
            class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs text-white outline-none focus:border-blue-500"
            placeholder="Global Default"
          >
        </div>

        <div class="text-[10px] text-gray-500">
          <div v-if="data.preferredModel">Using: <span class="text-blue-400">{{ data.preferredModel }}</span></div>
          <div v-else>Using Global: <span class="text-green-400">{{ store.modelName }}</span></div>
        </div>
      </div>
    </div>

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
