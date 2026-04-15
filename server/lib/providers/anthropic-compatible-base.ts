import type { ChatMessage } from '../../../src/types/graph'

interface AnthropicOptions {
  apiKey?: string
  baseUrl?: string
  defaultApiKey?: string
  defaultBaseUrl?: string
}

interface AnthropicGenerateOptions extends AnthropicOptions {
  messages: ChatMessage[]
  model: string
  maxTokens?: number
}

interface AnthropicTextPart {
  type?: string
  text?: string
}

interface AnthropicResponse {
  content?: AnthropicTextPart[]
}

interface AnthropicStreamEvent {
  type?: string
  delta?: {
    type?: string
    text?: string
  }
  content_block?: {
    type?: string
    text?: string
  }
}

export const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1'
const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_ANTHROPIC_MAX_TOKENS = 1024

function resolveAnthropicBaseUrl(baseUrl?: string, defaultBaseUrl = DEFAULT_ANTHROPIC_BASE_URL) {
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

function createAnthropicHeaders(options: AnthropicOptions) {
  const resolvedApiKey = options.apiKey?.trim() || options.defaultApiKey || ''

  return {
    'x-api-key': resolvedApiKey,
    'anthropic-version': ANTHROPIC_VERSION,
  }
}

export async function fetchAnthropicModels(options: AnthropicOptions) {
  const response = await fetch(`${resolveAnthropicBaseUrl(options.baseUrl, options.defaultBaseUrl)}/models`, {
    headers: createAnthropicHeaders(options),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`)
  }

  return response.json()
}

export async function generateAnthropicText(options: AnthropicGenerateOptions) {
  const response = await fetch(`${resolveAnthropicBaseUrl(options.baseUrl, options.defaultBaseUrl)}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createAnthropicHeaders(options),
    },
    body: JSON.stringify(buildAnthropicMessageBody(options, false)),
  })

  if (!response.ok) {
    throw new Error('Generation failed')
  }

  return ((await response.json()) as AnthropicResponse).content
    ?.filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('') || ''
}

export async function streamAnthropicText(options: AnthropicGenerateOptions) {
  const response = await fetch(`${resolveAnthropicBaseUrl(options.baseUrl, options.defaultBaseUrl)}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createAnthropicHeaders(options),
    },
    body: JSON.stringify(buildAnthropicMessageBody(options, true)),
  })

  return createPlainTextStreamResponse(response)
}

function buildAnthropicMessageBody(options: AnthropicGenerateOptions, stream: boolean) {
  const { system, messages } = splitAnthropicMessages(options.messages)

  return {
    model: options.model,
    system,
    messages,
    max_tokens: options.maxTokens ?? DEFAULT_ANTHROPIC_MAX_TOKENS,
    stream,
  }
}

function splitAnthropicMessages(messages: ChatMessage[]) {
  const system = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n')

  return {
    system: system || undefined,
    messages: messages
      .filter((message): message is ChatMessage & { role: 'user' | 'assistant' } => message.role !== 'system')
      .map((message) => ({ role: message.role, content: message.content })),
  }
}

function createPlainTextStreamResponse(response: Response) {
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
          flushBufferedEvents(buffer, controller, encoder)
          controller.close()
          return
        }

        buffer += decoder.decode(value, { stream: true })
        const segments = buffer.split('\n\n')
        buffer = segments.pop() ?? ''

        for (const segment of segments) {
          enqueueAnthropicEventText(segment, controller, encoder)
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
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
) {
  for (const segment of buffer.split('\n\n')) {
    enqueueAnthropicEventText(segment, controller, encoder)
  }
}

function enqueueAnthropicEventText(
  segment: string,
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

  const parsed = JSON.parse(eventData) as AnthropicStreamEvent
  const text = parsed.delta?.type === 'text_delta'
    ? parsed.delta.text
    : parsed.content_block?.type === 'text'
      ? parsed.content_block.text
      : ''

  if (text) {
    controller.enqueue(encoder.encode(text))
  }
}
