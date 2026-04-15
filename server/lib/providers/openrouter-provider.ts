import { getDefaultModelForProvider } from '../../../src/types/graph'
import {
  DEFAULT_OPENROUTER_BASE_URL,
  fetchOpenAICompatibleModels,
  generateOpenAICompatibleText,
  streamOpenAICompatibleText,
} from './openai-compatible-base'
import type { ProviderDefinition } from './types'

export const openRouterProvider: ProviderDefinition = {
  id: 'openrouter',
  defaultModel: getDefaultModelForProvider('openrouter'),
  fetchModels: ({ baseUrl, apiKey }) =>
    fetchOpenAICompatibleModels({
      baseUrl,
      apiKey,
      defaultApiKey: process.env.OPENROUTER_API_KEY || process.env.NUXT_OPENROUTER_API_KEY,
      defaultBaseUrl: DEFAULT_OPENROUTER_BASE_URL,
      extraHeaders: createOpenRouterAttributionHeaders(),
    }),
  streamText: ({ baseUrl, apiKey, model, messages }) =>
    streamOpenAICompatibleText({
      baseUrl,
      apiKey,
      model,
      messages,
      defaultApiKey: process.env.OPENROUTER_API_KEY || process.env.NUXT_OPENROUTER_API_KEY,
      defaultBaseUrl: DEFAULT_OPENROUTER_BASE_URL,
      extraHeaders: createOpenRouterAttributionHeaders(),
    }),
  generateText: ({ baseUrl, apiKey, model, messages }) =>
    generateOpenAICompatibleText({
      baseUrl,
      apiKey,
      model,
      messages,
      defaultApiKey: process.env.OPENROUTER_API_KEY || process.env.NUXT_OPENROUTER_API_KEY,
      defaultBaseUrl: DEFAULT_OPENROUTER_BASE_URL,
      extraHeaders: createOpenRouterAttributionHeaders(),
    }),
}

function createOpenRouterAttributionHeaders() {
  const referer = process.env.OPENROUTER_HTTP_REFERER || process.env.NUXT_OPENROUTER_HTTP_REFERER
  const title = process.env.OPENROUTER_X_TITLE || process.env.NUXT_OPENROUTER_X_TITLE
  const headers: Record<string, string> = {}

  if (referer) {
    headers['HTTP-Referer'] = referer
  }

  if (title) {
    headers['X-Title'] = title
  }

  return headers
}
