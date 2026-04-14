
import { createError, defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const baseUrl = query.baseUrl as string || 'http://localhost:1234/v1'
  const apiKey = query.apiKey as string || 'not-needed'

  try {
    // Ensure baseUrl doesn't end with a slash for consistent appending
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    const response = await fetch(`${cleanBaseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
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
