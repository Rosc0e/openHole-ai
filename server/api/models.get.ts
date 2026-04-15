import { createError, defineEventHandler, getQuery } from 'h3'
import type { AIProvider } from '../../src/types/graph'
import { getProvider } from '../lib/providers/registry'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const provider = (query.provider as AIProvider | undefined) ?? 'openai'
  const baseUrl = query.baseUrl as string | undefined
  const apiKey = query.apiKey as string | undefined

  try {
    return await getProvider(provider).fetchModels({ baseUrl, apiKey })
  } catch (error) {
    console.error('Error fetching models:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch models',
      message: error instanceof Error ? error.message : String(error)
    })
  }
})
