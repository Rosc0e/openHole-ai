import type { AIProvider, ChatMessage, GraphContent, SessionListResponse, StoredGraph } from '../types/graph'

interface ModelRequest {
  provider: AIProvider
  baseUrl: string
  apiKey: string
}

interface StreamRequest extends ModelRequest {
  messages: ChatMessage[]
  model: string
  onChunk: (chunk: string) => void
}

interface StartGenerationRequest extends ModelRequest {
  nodeId: string
  messages: ChatMessage[]
  model: string
}

export async function fetchGraph(id: string): Promise<StoredGraph> {
  const response = await fetch(`/api/graph/${id}`)

  if (!response.ok) {
    throw new Error('Failed to load graph')
  }

  return response.json() as Promise<StoredGraph>
}

export async function fetchGraphs(options?: { limit?: number; cursor?: string }): Promise<SessionListResponse> {
  const searchParams = new URLSearchParams()

  if (options?.limit) {
    searchParams.set('limit', String(options.limit))
  }

  if (options?.cursor) {
    searchParams.set('cursor', options.cursor)
  }

  const query = searchParams.toString()
  const response = await fetch(query ? `/api/graphs?${query}` : '/api/graphs')

  if (!response.ok) {
    throw new Error('Failed to load graphs')
  }

  return response.json() as Promise<SessionListResponse>
}

export async function deleteGraphRequest(id: string) {
  const response = await fetch(`/api/graph/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete graph')
  }
}

export async function syncGraphRequest(payload: {
  id: string
  title: string
  content: GraphContent
}) {
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Failed to sync graph')
  }
}

export async function startGraphGenerationRequest(graphId: string, payload: StartGenerationRequest) {
  const response = await fetch(`/api/graph/${graphId}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Failed to start generation')
  }

  return response.json() as Promise<{ started: boolean; graphId?: string; nodeId?: string; status?: string; runId?: string }>
}

export async function fetchModelsRequest({ provider, baseUrl, apiKey }: ModelRequest) {
  const response = await fetch(
    `/api/models?provider=${encodeURIComponent(provider)}&baseUrl=${encodeURIComponent(baseUrl)}&apiKey=${encodeURIComponent(apiKey)}`,
  )

  if (!response.ok) {
    throw new Error('Failed to fetch models')
  }

  const data = (await response.json()) as { data?: Array<{ id?: string }> }
  return normalizeModelList(data)
}

export async function streamAIResponse({
  provider,
  baseUrl,
  apiKey,
  messages,
  model,
  onChunk,
}: StreamRequest) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      provider,
      baseUrl,
      apiKey,
      model,
    }),
  })

  await streamPlainTextResponse(response, onChunk)
}

function normalizeModelList(data: { data?: Array<{ id?: string }> }) {
  if (!Array.isArray(data.data)) {
    throw new Error('Unexpected response format')
  }

  return data.data
    .map((model) => model.id)
    .filter((model): model is string => Boolean(model))
}

async function streamPlainTextResponse(response: Response, onChunk: (chunk: string) => void) {
  if (!response.ok || !response.body) {
    throw new Error('No response body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    const chunk = decoder.decode(value, { stream: true })
    if (chunk) {
      onChunk(chunk)
    }
  }
}
