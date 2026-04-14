import type { Mock } from 'vitest'

const readBody = vi.fn()
const defineEventHandler = vi.fn((handler) => handler)
const cloudModel = vi.fn((modelName: string) => ({ provider: 'cloud', modelName }))
const localModel = vi.fn((modelName: string) => ({ provider: 'local', modelName }))
const createOpenAI = vi.fn((config?: Record<string, unknown>) => {
  if (config?.baseURL) {
    return localModel
  }

  return cloudModel
})
const toTextStreamResponse = vi.fn(() => new Response('ok'))
const streamText = vi.fn(() => ({ toTextStreamResponse }))

vi.mock('h3', () => ({
  defineEventHandler,
  readBody,
}))

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI,
}))

vi.mock('ai', () => ({
  streamText,
}))

describe('server/api/chat.post', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('streams local provider responses', async () => {
    readBody.mockResolvedValueOnce({ provider: 'local', baseUrl: 'http://localhost:1234', apiKey: '', model: 'local-model', messages: [] })
    const handler = (await import('./chat.post')).default

    const response = await handler({})

    expect(createOpenAI).toHaveBeenCalledWith({
      baseURL: 'http://localhost:1234/v1',
      apiKey: 'not-needed',
    })
    expect(localModel).toHaveBeenCalledWith('local-model')
    expect(streamText).toHaveBeenCalledWith({ model: { provider: 'local', modelName: 'local-model' }, messages: [] })
    expect(response).toBeInstanceOf(Response)
  })

  it('streams cloud provider responses with environment fallback', async () => {
    readBody.mockResolvedValueOnce({ provider: 'openai', apiKey: '', model: '', messages: ['msg'] })
    process.env.OPENAI_API_KEY = 'env-key'
    const handler = (await import('./chat.post')).default

    await handler({})

    expect(createOpenAI).toHaveBeenCalledWith({ apiKey: 'env-key' })
    expect(cloudModel).toHaveBeenCalledWith('gpt-4o')
  })
})
