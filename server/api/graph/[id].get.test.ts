const getRouterParam = vi.fn()
const defineEventHandler = vi.fn((handler) => handler)
const createError = vi.fn((value) => value)
const where = vi.fn()
const from = vi.fn(() => ({ where }))
const select = vi.fn(() => ({ from }))

vi.mock('h3', () => ({
  createError,
  defineEventHandler,
  getRouterParam,
}))

vi.mock('../../db', () => ({
  db: { select },
}))

vi.mock('../../db/schema', () => ({
  graphs: { id: 'graph-id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
}))

describe('server/api/graph/[id].get', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires an id', async () => {
    getRouterParam.mockReturnValueOnce(undefined)
    const handler = (await import('./[id].get')).default

    await expect(handler({})).rejects.toEqual({ statusCode: 400, statusMessage: 'Graph ID is required' })
  })

  it('returns the graph when found and 404s when missing', async () => {
    getRouterParam.mockReturnValue('g1')
    where.mockResolvedValueOnce([{ id: 'g1' }]).mockResolvedValueOnce([])
    const handler = (await import('./[id].get')).default

    await expect(handler({})).resolves.toEqual({ id: 'g1' })
    await expect(handler({})).rejects.toEqual({ statusCode: 404, statusMessage: 'Graph not found' })
  })
})
