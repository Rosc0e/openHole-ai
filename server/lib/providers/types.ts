import type { AIProvider, ChatMessage } from '../../../src/types/graph'

export interface ProviderContext {
  baseUrl?: string
  apiKey?: string
}

export interface ProviderGenerateRequest extends ProviderContext {
  model: string
  messages: ChatMessage[]
}

export interface ProviderDefinition {
  id: AIProvider
  defaultModel: string
  fetchModels: (context: ProviderContext) => Promise<unknown>
  streamText: (request: ProviderGenerateRequest) => Promise<Response>
  generateText: (request: ProviderGenerateRequest) => Promise<string>
}
