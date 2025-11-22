<script setup lang="ts">
import { useGraphStore } from '~/stores/graph'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

const store = useGraphStore()
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="emit('close')">
    <div class="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-[500px] p-6 text-white">
      <h2 class="text-xl font-bold mb-4">Global Settings</h2>

      <div class="space-y-4">
        <!-- System Prompt -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1">System Prompt</label>
          <textarea 
            v-model="store.systemPrompt"
            class="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm focus:border-blue-500 outline-none"
            rows="4"
          ></textarea>
        </div>

        <!-- AI Provider -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1">AI Provider</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="aiProvider" value="openai" v-model="store.aiProvider" class="text-blue-500">
              <span>OpenAI (Cloud)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="aiProvider" value="local" v-model="store.aiProvider" class="text-blue-500">
              <span>LM Studio (Local)</span>
            </label>
          </div>
        </div>

        <!-- Local Base URL -->
        <div v-if="store.aiProvider === 'local'">
          <label class="block text-sm font-medium text-gray-400 mb-1">Local Base URL</label>
          <input 
            type="text" 
            v-model="store.localBaseUrl"
            class="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm focus:border-blue-500 outline-none"
            placeholder="http://localhost:1234/v1"
          >
        </div>

        <!-- API Key -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1">API Key {{ store.aiProvider === 'local' ? '(Optional)' : '' }}</label>
          <input 
            type="password" 
            v-model="store.apiKey"
            class="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm focus:border-blue-500 outline-none"
            placeholder="sk-..."
          >
        </div>

        <!-- Model Name -->
        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="block text-sm font-medium text-gray-400">Model Name</label>
            <button 
              v-if="store.aiProvider === 'local'"
              @click="store.fetchModels()"
              class="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              :disabled="store.isFetchingModels"
            >
              <span v-if="store.isFetchingModels" class="animate-spin">↻</span>
              <span v-else>↻</span>
              Refresh Models
            </button>
          </div>
          
          <div v-if="store.fetchError" class="text-xs text-red-400 mb-2">
            {{ store.fetchError }}
          </div>

          <div v-if="store.aiProvider === 'local' && store.availableModels && store.availableModels.length > 0">
            <select 
              v-model="store.modelName"
              class="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm focus:border-blue-500 outline-none text-white appearance-none"
            >
              <option v-for="model in store.availableModels" :key="model" :value="model">
                {{ model }}
              </option>
            </select>
          </div>
          <input 
            v-else
            type="text" 
            v-model="store.modelName"
            class="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm focus:border-blue-500 outline-none"
            placeholder="gpt-4o or local-model"
          >
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <button 
          @click="emit('close')"
          class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
