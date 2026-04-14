const readBody = vi.fn()
const defineEventHandler = vi.fn((handler) => handler)
const createError = vi.fn((value) => value)
const where = vi.fn()
const from = vi.fn(() => ({ where }))
const select = vi.fn(() => ({ from }))
const updateWhere = vi.fn()
const updateSet = vi.fn(() => ({ where: updateWhere }))
const update = vi.fn(() => ({ set: updateSet }))
const insertValues = vi.fn()
const insert = vi.fn(() => ({ values: insertValues }))

vi.mock('h3', () => ({
  createError,
  defineEventHandler,
  readBody,
}))

vi.mock('../db', () => ({
  db: { select, update, insert },
}))

vi.mock('../db/schema', () => ({
  graphs: { id: 'graph-id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
}))

describe('server/api/sync.post', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires a graph id', async () => {
    readBody.mockResolvedValueOnce({})
    const handler = (await import('./sync.post')).default

    await expect(handler({})).rejects.toEqual({ statusCode: 400, statusMessage: 'Graph ID is required' })
  })

  it('updates existing graphs', async () => {
    readBody.mockResolvedValueOnce({ id: 'g1', title: 'Graph', content: { nodes: [], edges: [] } })
    where.mockResolvedValueOnce([{ id: 'g1', title: 'Old' }])
    const handler = (await import('./sync.post')).default

    await expect(handler({})).resolves.toEqual({ success: true })
    expect(update).toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it('inserts new graphs', async () => {
    readBody.mockResolvedValueOnce({ id: 'g2', title: '', content: { nodes: [], edges: [] } })
    where.mockResolvedValueOnce([])
    const handler = (await import('./sync.post')).default

    await expect(handler({})).resolves.toEqual({ success: true })
    expect(insertValues).toHaveBeenCalledWith({ id: 'g2', title: 'Untitled Graph', content: { nodes: [], edges: [] } })
  })
})
