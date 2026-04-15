const getRouterParam = vi.fn()
const defineEventHandler = vi.fn((handler) => handler)
const createError = vi.fn((value) => value)
const setResponseStatus = vi.fn()
const where = vi.fn()
const del = vi.fn(() => ({ where }))

vi.mock('h3', () => ({
  createError,
  defineEventHandler,
  getRouterParam,
  setResponseStatus,
}))

vi.mock('../../db', () => ({
  db: { delete: del },
}))

vi.mock('../../db/schema', () => ({
  graphs: { id: 'graph-id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
}))

describe('server/api/graph/[id].delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires a graph id', async () => {
    getRouterParam.mockReturnValueOnce(undefined)
    const handler = (await import('./[id].delete')).default

    await expect(handler({})).rejects.toEqual({ statusCode: 400, statusMessage: 'Graph ID is required' })
  })

  it('deletes the graph and returns no content', async () => {
    getRouterParam.mockReturnValueOnce('g1')
    where.mockResolvedValueOnce(undefined)
    const handler = (await import('./[id].delete')).default

    await expect(handler({})).resolves.toBeNull()
    expect(del).toHaveBeenCalled()
    expect(where).toHaveBeenCalledWith(['graph-id', 'g1'])
    expect(setResponseStatus).toHaveBeenCalledWith({}, 204)
  })
})
