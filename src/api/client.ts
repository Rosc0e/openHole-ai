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
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')

  if (provider === 'local') {
    const response = await fetch(`${cleanBaseUrl}/models`)
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`)
    }

    const data = (await response.json()) as { data?: Array<{ id?: string }> }
    return normalizeModelList(data)
  }

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
  if (provider === 'local') {
    await streamLocalResponse({ baseUrl, messages, model, onChunk })
    return
  }

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

async function streamLocalResponse({
  baseUrl,
  messages,
  model,
  onChunk,
}: Pick<StreamRequest, 'baseUrl' | 'messages' | 'model' | 'onChunk'>) {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'local-model',
      messages,
      stream: true,
    }),
  })

  if (!response.ok || !response.body) {
    throw new Error('No response body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()

      if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) {
        continue
      }

      const payload = JSON.parse(trimmed.slice(6)) as {
        choices?: Array<{ delta?: { content?: string } }>
      }

      const chunk = payload.choices?.[0]?.delta?.content ?? ''
      if (chunk) {
        onChunk(chunk)
      }
    }
  }
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
