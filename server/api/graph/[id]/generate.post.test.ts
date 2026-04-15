const readBody = vi.fn()
const getRouterParam = vi.fn()
const defineEventHandler = vi.fn((handler) => handler)
const createError = vi.fn((value) => value)
const startGraphGeneration = vi.fn()

vi.mock('h3', () => ({
  createError,
  defineEventHandler,
  getRouterParam,
  readBody,
}))

vi.mock('../../../lib/background-generation', () => ({
  startGraphGeneration,
}))

describe('server/api/graph/[id]/generate.post', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires a graph id and node id', async () => {
    getRouterParam.mockReturnValueOnce(undefined)
    readBody.mockResolvedValueOnce({})

    const handler = (await import('./generate.post')).default

    await expect(handler({})).rejects.toEqual({ statusCode: 400, statusMessage: 'Graph ID is required' })

    getRouterParam.mockReturnValueOnce('g1')
    readBody.mockResolvedValueOnce({})

    await expect(handler({})).rejects.toEqual({ statusCode: 400, statusMessage: 'Node ID is required' })
  })

  it('starts background generation and returns accepted lifecycle state', async () => {
    getRouterParam.mockReturnValueOnce('g1')
    readBody.mockResolvedValueOnce({
      nodeId: 'n1',
      provider: 'lmstudio',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: '',
      model: 'local-model',
      messages: [{ role: 'user', content: 'Hello' }],
    })
    startGraphGeneration.mockResolvedValueOnce({
      graphId: 'g1',
      nodeId: 'n1',
      status: 'running',
      runId: 'run-1',
    })

    const handler = (await import('./generate.post')).default

    await expect(handler({})).resolves.toEqual({
      started: true,
      graphId: 'g1',
      nodeId: 'n1',
      status: 'running',
      runId: 'run-1',
    })
  })
})
