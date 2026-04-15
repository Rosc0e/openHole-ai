const getQuery = vi.fn()
const defineEventHandler = vi.fn((handler) => handler)
const createError = vi.fn((value) => value)

vi.mock('h3', () => ({
  createError,
  defineEventHandler,
  getQuery,
}))

describe('server/api/models.get', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('proxies model lists', async () => {
    getQuery.mockReturnValue({ provider: 'openrouter', baseUrl: '', apiKey: 'secret' })
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 'a' }] }), { status: 200 }))
    const handler = (await import('./models.get')).default

    await expect(handler({})).resolves.toEqual({ data: [{ id: 'a' }] })
    expect(fetchMock).toHaveBeenCalledWith('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: 'Bearer secret' },
    })
  })

  it('uses anthropic-compatible headers for anthropic model lists', async () => {
    getQuery.mockReturnValue({ provider: 'anthropic', baseUrl: '', apiKey: 'anthropic-key' })
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 'claude' }] }), { status: 200 }))
    const handler = (await import('./models.get')).default

    await expect(handler({})).resolves.toEqual({ data: [{ id: 'claude' }] })
    expect(fetchMock).toHaveBeenCalledWith('https://api.anthropic.com/v1/models', {
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key': 'anthropic-key',
      },
    })
  })

  it('throws a normalized error on upstream failure', async () => {
    getQuery.mockReturnValue({})
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500, statusText: 'Bad' }))
    const handler = (await import('./models.get')).default

    await expect(handler({})).rejects.toEqual({
      statusCode: 500,
      statusMessage: 'Failed to fetch models',
      message: 'Failed to fetch models: Bad',
    })
  })
})
