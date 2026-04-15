import { getDefaultModelForProvider } from '../../../src/types/graph'
import {
  DEFAULT_OPENAI_BASE_URL,
  fetchOpenAICompatibleModels,
  generateOpenAICompatibleText,
  streamOpenAICompatibleText,
} from './openai-compatible-base'
import type { ProviderDefinition } from './types'

export const openAIProvider: ProviderDefinition = {
  id: 'openai',
  defaultModel: getDefaultModelForProvider('openai'),
  fetchModels: ({ baseUrl, apiKey }) =>
    fetchOpenAICompatibleModels({
      baseUrl,
      apiKey,
      defaultApiKey: process.env.OPENAI_API_KEY || process.env.NUXT_OPENAI_API_KEY,
      defaultBaseUrl: DEFAULT_OPENAI_BASE_URL,
    }),
  streamText: ({ baseUrl, apiKey, model, messages }) =>
    streamOpenAICompatibleText({
      baseUrl,
      apiKey,
      model,
      messages,
      defaultApiKey: process.env.OPENAI_API_KEY || process.env.NUXT_OPENAI_API_KEY,
      defaultBaseUrl: DEFAULT_OPENAI_BASE_URL,
    }),
  generateText: ({ baseUrl, apiKey, model, messages }) =>
    generateOpenAICompatibleText({
      baseUrl,
      apiKey,
      model,
      messages,
      defaultApiKey: process.env.OPENAI_API_KEY || process.env.NUXT_OPENAI_API_KEY,
      defaultBaseUrl: DEFAULT_OPENAI_BASE_URL,
    }),
}
