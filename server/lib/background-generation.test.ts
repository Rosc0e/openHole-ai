const dbState = {
  graph: {
    id: 'g1',
    content: {
      nodes: [
        {
          id: 'n1',
          type: 'chatPair',
          position: { x: 0, y: 0 },
          data: {
            userText: 'Hi',
            aiText: '',
          },
        },
      ],
      edges: [],
    },
  },
  updates: [] as Array<Record<string, unknown>>,
}

const selectWhere = vi.fn(async () => [dbState.graph])
const selectFrom = vi.fn(() => ({ where: selectWhere }))
const dbUpdateWhere = vi.fn(async () => undefined)
const dbUpdateSet = vi.fn((payload: Record<string, unknown>) => {
  dbState.updates.push(payload)

  if ('content' in payload) {
    dbState.graph = {
      ...dbState.graph,
      content: payload.content,
    }
  }

  return { where: dbUpdateWhere }
})
const dbUpdate = vi.fn(() => ({ set: dbUpdateSet }))

vi.mock('../db', () => ({
  db: {
    select: vi.fn(() => ({ from: selectFrom })),
    update: dbUpdate,
  },
}))

vi.mock('../db/schema', () => ({
  graphs: { id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
}))

describe('background generation', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    dbState.graph = {
      id: 'g1',
      content: {
        nodes: [
          {
            id: 'n1',
            type: 'chatPair',
            position: { x: 0, y: 0 },
            data: {
              userText: 'Hi',
              aiText: '',
            },
          },
        ],
        edges: [],
      },
    }
    dbState.updates = []
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('crypto', { randomUUID: () => 'run-1' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the provider registry for anthropic background generation', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'Hello' }],
        }),
        { status: 200 },
      ),
    )

    const { startGraphGeneration } = await import('./background-generation')

    await expect(
      startGraphGeneration({
        graphId: 'g1',
        nodeId: 'n1',
        provider: 'anthropic',
        baseUrl: '',
        apiKey: 'anthropic-key',
        model: 'claude-3-5-haiku-latest',
        messages: [
          { role: 'system', content: 'Be helpful' },
          { role: 'user', content: 'Hi' },
        ],
      }),
    ).resolves.toEqual({
      graphId: 'g1',
      nodeId: 'n1',
      runId: 'run-1',
      status: 'running',
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(dbState.updates).toHaveLength(2)
    expect(dbState.graph.content.nodes[0]?.data).toEqual(
      expect.objectContaining({
        aiText: 'Hello',
        generationStatus: 'complete',
        tokens: 2,
      }),
    )
  })
})
