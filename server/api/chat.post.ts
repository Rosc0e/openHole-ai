import { streamText, type ModelMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { defineEventHandler, readBody } from 'h3'
import { DEFAULT_LOCAL_OPENAI_BASE_URL, resolveOpenAICompatibleBaseUrl } from '../lib/openai-compatible'

interface ChatRequestBody {
  messages: ModelMessage[]
  provider?: 'openai' | 'local'
  baseUrl?: string
  apiKey?: string
  model?: string
}

export default defineEventHandler(async (event) => {
  const { messages, provider, baseUrl, apiKey, model: modelName } = await readBody<ChatRequestBody>(event)

  let model

  if (provider === 'local') {
    const localOpenAI = createOpenAI({
      baseURL: resolveOpenAICompatibleBaseUrl(baseUrl) || DEFAULT_LOCAL_OPENAI_BASE_URL,
      apiKey: apiKey || 'not-needed',
    })
    model = localOpenAI(modelName || 'local-model')
  } else {
    const openai = createOpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || process.env.NUXT_OPENAI_API_KEY,
    })
    model = openai(modelName || 'gpt-4o')
  }

  const result = streamText({
    model,
    messages,
  })

  return result.toTextStreamResponse()
})
