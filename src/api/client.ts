import type { AIProvider, ChatMessage, GraphContent, StoredGraph } from '../types/graph'

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

export async function fetchGraph(id: string): Promise<StoredGraph> {
  const response = await fetch(`/api/graph/${id}`)

  if (!response.ok) {
    throw new Error('Failed to load graph')
  }

  return response.json() as Promise<StoredGraph>
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

export async function fetchModelsRequest({ provider, baseUrl, apiKey }: ModelRequest) {
  const response = await fetch(
    `/api/models?baseUrl=${encodeURIComponent(baseUrl)}&apiKey=${encodeURIComponent(apiKey)}`,
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
