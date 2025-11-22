import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

export default defineEventHandler(async (event) => {
  const { messages, provider, baseUrl } = await readBody(event)

  let model

  if (provider === 'local') {
    const localOpenAI = createOpenAI({
      baseURL: baseUrl || 'http://localhost:1234/v1',
      apiKey: 'not-needed',
    })
    model = localOpenAI('local-model')
  } else {
    const openai = createOpenAI({
      apiKey: process.env.NUXT_OPENAI_API_KEY,
    })
    model = openai('gpt-4o')
  }

  const result = streamText({
    model,
    messages,
  })

  return result.toTextStreamResponse()
})
