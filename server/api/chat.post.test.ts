const readBody = vi.fn()
const defineEventHandler = vi.fn((handler) => handler)

vi.mock('h3', () => ({
  defineEventHandler,
  readBody,
}))

function createSseResponse(chunks: string[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk))
        }

        controller.close()
      },
    }),
    { status: 200 },
  )
}

describe('server/api/chat.post', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('streams LM Studio responses through the provider registry', async () => {
    readBody.mockResolvedValueOnce({ provider: 'lmstudio', baseUrl: 'http://localhost:1234', apiKey: '', model: 'local-model', messages: [] })
    fetchMock.mockResolvedValueOnce(
      createSseResponse([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    )
    const handler = (await import('./chat.post')).default

    const response = await handler({})
    const text = await response.text()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:1234/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(text).toBe('Hello world')
  })

  it('streams Anthropic responses with Anthropic headers and message shape', async () => {
    readBody.mockResolvedValueOnce({
      provider: 'anthropic',
      apiKey: 'anthropic-key',
      model: 'claude-3-5-haiku-latest',
      messages: [
        { role: 'system', content: 'Be helpful' },
        { role: 'user', content: 'Hi' },
      ],
    })
    fetchMock.mockResolvedValueOnce(
      createSseResponse([
        'event: content_block_delta\n',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
        'event: content_block_delta\n',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" there"}}\n\n',
      ]),
    )
    const handler = (await import('./chat.post')).default

    const response = await handler({})
    const text = await response.text()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'anthropic-key',
          'anthropic-version': '2023-06-01',
        }),
        method: 'POST',
      }),
    )
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify({
          model: 'claude-3-5-haiku-latest',
          system: 'Be helpful',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1024,
          stream: true,
        }),
      }),
    )
    expect(text).toBe('Hello there')
  })
})
