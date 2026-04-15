import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { startGraphGeneration } from '../../../lib/background-generation'
import type { AIProvider, ChatMessage } from '../../../../src/types/graph'
import { getDefaultModelForProvider } from '../../../../src/types/graph'

interface GenerateRequestBody {
  nodeId?: string
  provider?: AIProvider
  baseUrl?: string
  apiKey?: string
  model?: string
  messages?: ChatMessage[]
}

export default defineEventHandler(async (event) => {
  const graphId = getRouterParam(event, 'id')
  const body = await readBody<GenerateRequestBody>(event)

  if (!graphId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Graph ID is required',
    })
  }

  if (!body.nodeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Node ID is required',
    })
  }

  const result = await startGraphGeneration({
    graphId,
    nodeId: body.nodeId,
    provider: body.provider ?? 'openai',
    baseUrl: body.baseUrl ?? '',
    apiKey: body.apiKey ?? '',
    model: body.model?.trim() || getDefaultModelForProvider(body.provider ?? 'openai'),
    messages: body.messages ?? [],
  })

  return {
    started: true,
    ...result,
  }
})
