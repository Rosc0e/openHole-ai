const getQuery = vi.fn()
const defineEventHandler = vi.fn((handler) => handler)
const desc = vi.fn((value) => value)
const lt = vi.fn((...args: unknown[]) => args)
const limit = vi.fn()
const orderBy = vi.fn(() => ({ limit }))
const where = vi.fn(() => ({ orderBy }))
const from = vi.fn(() => ({ where, orderBy }))
const select = vi.fn(() => ({ from }))

vi.mock('h3', () => ({
  defineEventHandler,
  getQuery,
}))

vi.mock('../db', () => ({
  db: { select },
}))

vi.mock('../db/schema', () => ({
  graphs: { id: 'graph-id', title: 'graph-title', updatedAt: 'graph-updated-at' },
}))

vi.mock('drizzle-orm', () => ({
  desc,
  lt,
}))

describe('server/api/graphs.get', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the first page of recent graphs', async () => {
    getQuery.mockReturnValueOnce({ limit: '2' })
    limit.mockResolvedValueOnce([
      { id: 'g3', title: 'Newest', updatedAt: new Date('2026-04-14T03:00:00.000Z') },
      { id: 'g2', title: 'Older', updatedAt: new Date('2026-04-14T02:00:00.000Z') },
    ])

    const handler = (await import('./graphs.get')).default

    await expect(handler({})).resolves.toEqual({
      items: [
        { id: 'g3', title: 'Newest', updatedAt: '2026-04-14T03:00:00.000Z' },
        { id: 'g2', title: 'Older', updatedAt: '2026-04-14T02:00:00.000Z' },
      ],
      nextCursor: '2026-04-14T02:00:00.000Z',
    })

    expect(orderBy).toHaveBeenCalled()
    expect(limit).toHaveBeenCalledWith(2)
  })

  it('applies a cursor filter for later pages', async () => {
    getQuery.mockReturnValueOnce({ limit: '3', cursor: '2026-04-14T02:00:00.000Z' })
    limit.mockResolvedValueOnce([{ id: 'g1', title: 'Oldest', updatedAt: new Date('2026-04-14T01:00:00.000Z') }])

    const handler = (await import('./graphs.get')).default

    await expect(handler({})).resolves.toEqual({
      items: [{ id: 'g1', title: 'Oldest', updatedAt: '2026-04-14T01:00:00.000Z' }],
      nextCursor: null,
    })

    expect(lt).toHaveBeenCalledWith('graph-updated-at', new Date('2026-04-14T02:00:00.000Z'))
  })
})
