import { getDefaultModelForProvider } from '../../../src/types/graph'
import {
  DEFAULT_ANTHROPIC_BASE_URL,
  fetchAnthropicModels,
  generateAnthropicText,
  streamAnthropicText,
} from './anthropic-compatible-base'
import type { ProviderDefinition } from './types'

export const anthropicProvider: ProviderDefinition = {
  id: 'anthropic',
  defaultModel: getDefaultModelForProvider('anthropic'),
  fetchModels: ({ baseUrl, apiKey }) =>
    fetchAnthropicModels({
      baseUrl,
      apiKey,
      defaultApiKey: process.env.ANTHROPIC_API_KEY || process.env.NUXT_ANTHROPIC_API_KEY,
      defaultBaseUrl: DEFAULT_ANTHROPIC_BASE_URL,
    }),
  streamText: ({ baseUrl, apiKey, model, messages }) =>
    streamAnthropicText({
      baseUrl,
      apiKey,
      model,
      messages,
      defaultApiKey: process.env.ANTHROPIC_API_KEY || process.env.NUXT_ANTHROPIC_API_KEY,
      defaultBaseUrl: DEFAULT_ANTHROPIC_BASE_URL,
    }),
  generateText: ({ baseUrl, apiKey, model, messages }) =>
    generateAnthropicText({
      baseUrl,
      apiKey,
      model,
      messages,
      defaultApiKey: process.env.ANTHROPIC_API_KEY || process.env.NUXT_ANTHROPIC_API_KEY,
      defaultBaseUrl: DEFAULT_ANTHROPIC_BASE_URL,
    }),
}
