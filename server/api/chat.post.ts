import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { messages, provider, baseUrl, apiKey, model: modelName } = await readBody(event)

  let model

  if (provider === 'local') {
    const localOpenAI = createOpenAI({
      baseURL: baseUrl || 'http://localhost:1234/v1',
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
