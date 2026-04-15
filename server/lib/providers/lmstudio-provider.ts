import { getDefaultModelForProvider } from '../../../src/types/graph'
import {
  DEFAULT_LMSTUDIO_BASE_URL,
  fetchOpenAICompatibleModels,
  generateOpenAICompatibleText,
  streamOpenAICompatibleText,
} from './openai-compatible-base'
import type { ProviderDefinition } from './types'

export const lmStudioProvider: ProviderDefinition = {
  id: 'lmstudio',
  defaultModel: getDefaultModelForProvider('lmstudio'),
  fetchModels: ({ baseUrl, apiKey }) =>
    fetchOpenAICompatibleModels({
      baseUrl,
      apiKey,
      defaultBaseUrl: DEFAULT_LMSTUDIO_BASE_URL,
    }),
  streamText: ({ baseUrl, apiKey, model, messages }) =>
    streamOpenAICompatibleText({
      baseUrl,
      apiKey,
      model,
      messages,
      defaultBaseUrl: DEFAULT_LMSTUDIO_BASE_URL,
    }),
  generateText: ({ baseUrl, apiKey, model, messages }) =>
    generateOpenAICompatibleText({
      baseUrl,
      apiKey,
      model,
      messages,
      defaultBaseUrl: DEFAULT_LMSTUDIO_BASE_URL,
    }),
}
