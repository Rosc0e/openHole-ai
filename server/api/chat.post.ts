import { defineEventHandler, readBody } from 'h3'
import type { AIProvider, ChatMessage } from '../../src/types/graph'
import { getDefaultModelForProvider } from '../../src/types/graph'
import { getProvider } from '../lib/providers/registry'

interface ChatRequestBody {
  messages?: ChatMessage[]
  provider?: AIProvider
  baseUrl?: string
  apiKey?: string
  model?: string
}

export default defineEventHandler(async (event) => {
  const { messages, provider, baseUrl, apiKey, model: modelName } = await readBody<ChatRequestBody>(event)
  const resolvedProvider = provider ?? 'openai'

  return getProvider(resolvedProvider).streamText({
    baseUrl,
    apiKey,
    messages: messages ?? [],
    model: modelName?.trim() || getDefaultModelForProvider(resolvedProvider),
  })
})
