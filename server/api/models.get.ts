import { createError, defineEventHandler, getQuery } from 'h3'
import { createOpenAICompatibleHeaders, resolveOpenAICompatibleModelsUrl } from '../lib/openai-compatible'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const baseUrl = query.baseUrl as string | undefined
  const apiKey = query.apiKey as string | undefined

  try {
    const response = await fetch(resolveOpenAICompatibleModelsUrl(baseUrl), {
      headers: createOpenAICompatibleHeaders(apiKey),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching models:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch models',
      message: error instanceof Error ? error.message : String(error)
    })
  }
})
