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
    getQuery.mockReturnValue({ baseUrl: 'http://localhost:1234/v1/', apiKey: 'secret' })
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 'a' }] }), { status: 200 }))
    const handler = (await import('./models.get')).default

    await expect(handler({})).resolves.toEqual({ data: [{ id: 'a' }] })
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:1234/v1/models', {
      headers: { Authorization: 'Bearer secret' },
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
