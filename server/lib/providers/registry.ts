import type { AIProvider } from '../../../src/types/graph'
import { anthropicProvider } from './anthropic-provider'
import { lmStudioProvider } from './lmstudio-provider'
import { openAIProvider } from './openai-provider'
import { openRouterProvider } from './openrouter-provider'
import type { ProviderDefinition } from './types'

export const providerRegistry: Record<AIProvider, ProviderDefinition> = {
  openai: openAIProvider,
  openrouter: openRouterProvider,
  anthropic: anthropicProvider,
  lmstudio: lmStudioProvider,
}

export function getProvider(provider: AIProvider) {
  return providerRegistry[provider]
}
