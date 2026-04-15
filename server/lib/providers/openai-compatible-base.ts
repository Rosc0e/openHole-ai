import type { ChatMessage } from '../../../src/types/graph'

interface OpenAICompatibleOptions {
  apiKey?: string
  baseUrl?: string
  defaultApiKey?: string
  defaultBaseUrl: string
  extraHeaders?: Record<string, string>
}

interface OpenAICompatibleGenerateOptions extends OpenAICompatibleOptions {
  messages: ChatMessage[]
  model: string
}

interface OpenAICompatibleMessagePart {
  type?: string
  text?: string
}

interface OpenAICompatibleMessage {
  content?: string | OpenAICompatibleMessagePart[]
}

interface OpenAICompatibleChoice {
  delta?: OpenAICompatibleMessage
  message?: OpenAICompatibleMessage
}

interface OpenAICompatibleResponse {
  choices?: OpenAICompatibleChoice[]
}

export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
export const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
export const DEFAULT_LMSTUDIO_BASE_URL = 'http://localhost:1234/v1'

function resolveOpenAICompatibleBaseUrl(baseUrl: string | undefined, defaultBaseUrl: string) {
  const value = baseUrl?.trim()

  if (!value) {
    return defaultBaseUrl
  }

  const url = new URL(value)
  const normalizedPath = url.pathname.replace(/\/+$/, '')

  if (!normalizedPath || normalizedPath === '/') {
    url.pathname = '/v1'
  } else if (!normalizedPath.endsWith('/v1')) {
    url.pathname = `${normalizedPath}/v1`
  } else {
    url.pathname = normalizedPath
  }

  return url.toString().replace(/\/$/, '')
}

function createOpenAICompatibleHeaders({ apiKey, defaultApiKey, extraHeaders }: OpenAICompatibleOptions) {
  const resolvedApiKey = apiKey?.trim() || defaultApiKey || 'not-needed'

  return {
    Authorization: `Bearer ${resolvedApiKey}`,
    ...extraHeaders,
  }
}

export async function fetchOpenAICompatibleModels(options: OpenAICompatibleOptions) {
  const baseUrl = resolveOpenAICompatibleBaseUrl(options.baseUrl, options.defaultBaseUrl)
  const response = await fetch(`${baseUrl}/models`, {
    headers: createOpenAICompatibleHeaders(options),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`)
  }

  return response.json()
}

export async function generateOpenAICompatibleText(options: OpenAICompatibleGenerateOptions) {
  const baseUrl = resolveOpenAICompatibleBaseUrl(options.baseUrl, options.defaultBaseUrl)
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createOpenAICompatibleHeaders(options),
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: false,
    }),
  })

  if (!response.ok) {
    throw new Error('Generation failed')
  }

  return extractOpenAICompatibleText((await response.json()) as OpenAICompatibleResponse)
}

export async function streamOpenAICompatibleText(options: OpenAICompatibleGenerateOptions) {
  const baseUrl = resolveOpenAICompatibleBaseUrl(options.baseUrl, options.defaultBaseUrl)
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createOpenAICompatibleHeaders(options),
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
    }),
  })

  return createPlainTextStreamResponse(response, extractOpenAICompatibleDelta)
}

function extractOpenAICompatibleText(data: OpenAICompatibleResponse) {
  return (data.choices ?? [])
    .map((choice) => extractOpenAICompatibleMessageText(choice.message?.content))
    .join('')
}

function extractOpenAICompatibleDelta(eventData: string) {
  if (eventData === '[DONE]') {
    return ''
  }

  const parsed = JSON.parse(eventData) as OpenAICompatibleResponse

  return (parsed.choices ?? [])
    .map((choice) => extractOpenAICompatibleMessageText(choice.delta?.content))
    .join('')
}

function extractOpenAICompatibleMessageText(content: OpenAICompatibleMessage['content']) {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('')
  }

  return ''
}

function createPlainTextStreamResponse(response: Response, extractText: (eventData: string) => string) {
  if (!response.ok || !response.body) {
    throw new Error('No response body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  const stream = new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          flushBufferedEvents(buffer, extractText, controller, encoder)
          controller.close()
          return
        }

        buffer += decoder.decode(value, { stream: true })
        const segments = buffer.split('\n\n')
        buffer = segments.pop() ?? ''

        for (const segment of segments) {
          enqueueEventText(segment, extractText, controller, encoder)
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

function flushBufferedEvents(
  buffer: string,
  extractText: (eventData: string) => string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
) {
  for (const segment of buffer.split('\n\n')) {
    enqueueEventText(segment, extractText, controller, encoder)
  }
}

function enqueueEventText(
  segment: string,
  extractText: (eventData: string) => string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
) {
  const eventData = segment
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n')

  if (!eventData) {
    return
  }

  const text = extractText(eventData)

  if (text) {
    controller.enqueue(encoder.encode(text))
  }
}
