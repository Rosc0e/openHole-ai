import { deleteGraphRequest, fetchGraph, fetchGraphs, fetchModelsRequest, startGraphGenerationRequest, streamAIResponse, syncGraphRequest } from './client'

function createTextStream(chunks: string[]) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk))
      }
      controller.close()
    },
  })
}

describe('api client', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads a graph', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'g1', title: 'Title', content: { nodes: [], edges: [] } }), { status: 200 }),
    )

    await expect(fetchGraph('g1')).resolves.toEqual({
      id: 'g1',
      title: 'Title',
      content: { nodes: [], edges: [] },
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/graph/g1')
  })

  it('loads paginated graphs', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [{ id: 'g2', title: 'Recent', updatedAt: '2026-04-14T00:00:00.000Z' }],
          nextCursor: 'cursor-2',
        }),
        { status: 200 },
      ),
    )

    await expect(fetchGraphs({ limit: 10, cursor: 'cursor-1' })).resolves.toEqual({
      items: [{ id: 'g2', title: 'Recent', updatedAt: '2026-04-14T00:00:00.000Z' }],
      nextCursor: 'cursor-2',
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/graphs?limit=10&cursor=cursor-1')
  })

  it('throws on paginated graph load failure', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))

    await expect(fetchGraphs()).rejects.toThrow('Failed to load graphs')
  })

  it('throws on graph load failure', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))
    await expect(fetchGraph('g1')).rejects.toThrow('Failed to load graph')
  })

  it('syncs the graph payload', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))

    await syncGraphRequest({ id: 'g1', title: 'Graph', content: { nodes: [], edges: [] } })

    expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({ method: 'POST' }))
  })

  it('throws on sync failure', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))
    await expect(syncGraphRequest({ id: 'g1', title: 'Graph', content: { nodes: [], edges: [] } })).rejects.toThrow(
      'Failed to sync graph',
    )
  })

  it('deletes a graph session', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(deleteGraphRequest('g1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/graph/g1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('throws on graph deletion failure', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))

    await expect(deleteGraphRequest('g1')).rejects.toThrow('Failed to delete graph')
  })

  it('starts a background graph generation job', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ started: true }), { status: 202 }))

    await expect(
      startGraphGenerationRequest('g1', {
        nodeId: 'n1',
        provider: 'lmstudio',
        baseUrl: 'http://localhost:1234/v1',
        apiKey: '',
        model: 'local-model',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).resolves.toEqual({ started: true })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/graph/g1/generate',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })

  it('throws when starting a background generation job fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))

    await expect(
      startGraphGenerationRequest('g1', {
        nodeId: 'n1',
        provider: 'openai',
        baseUrl: 'http://localhost:1234/v1',
        apiKey: 'secret',
        model: 'gpt-4o',
        messages: [],
      }),
    ).rejects.toThrow('Failed to start generation')
  })

  it('fetches LM Studio models through the proxy', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: 'model-a' }, { id: 'model-b' }] }), { status: 200 }),
    )

    await expect(
      fetchModelsRequest({ provider: 'lmstudio', baseUrl: 'http://localhost:1234/v1/', apiKey: '' }),
    ).resolves.toEqual(['model-a', 'model-b'])

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/models?provider=lmstudio&baseUrl=http%3A%2F%2Flocalhost%3A1234%2Fv1%2F&apiKey=',
    )
  })

  it('throws on proxied LM Studio model fetch failure', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))

    await expect(
      fetchModelsRequest({ provider: 'lmstudio', baseUrl: 'http://localhost:1234/v1/', apiKey: '' }),
    ).rejects.toThrow('Failed to fetch models')
  })

  it('fetches cloud models through the proxy and validates payloads', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))

    await expect(
      fetchModelsRequest({ provider: 'openai', baseUrl: 'http://localhost:1234/v1', apiKey: 'secret' }),
    ).rejects.toThrow('Unexpected response format')
  })

  it('throws on cloud model proxy failure', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))

    await expect(
      fetchModelsRequest({ provider: 'openai', baseUrl: 'http://localhost:1234/v1', apiKey: 'secret' }),
    ).rejects.toThrow('Failed to fetch models')
  })

  it('streams LM Studio responses through the server proxy', async () => {
    const chunks: string[] = []
    fetchMock.mockResolvedValueOnce(new Response(createTextStream(['Hello', ' world']), { status: 200 }))

    await streamAIResponse({
      provider: 'lmstudio',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: '',
      messages: [{ role: 'user', content: 'Hi' }],
      model: 'local-model',
      onChunk: (chunk) => chunks.push(chunk),
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(chunks).toEqual(['Hello', ' world'])
  })

  it('streams cloud ai responses from plain text responses', async () => {
    const chunks: string[] = []
    fetchMock.mockResolvedValueOnce(new Response(createTextStream(['Hello', ' world']), { status: 200 }))

    await streamAIResponse({
      provider: 'openai',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: 'secret',
      messages: [{ role: 'user', content: 'Hi' }],
      model: 'gpt-4o',
      onChunk: (chunk) => chunks.push(chunk),
    })

    expect(chunks).toEqual(['Hello', ' world'])
  })

  it('throws when streaming responses are invalid', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))

    await expect(
      streamAIResponse({
        provider: 'openai',
        baseUrl: 'http://localhost:1234/v1',
        apiKey: 'secret',
        messages: [],
        model: 'gpt-4o',
        onChunk: vi.fn(),
      }),
    ).rejects.toThrow('No response body')
  })

  it('throws when proxied LM Studio streaming responses are invalid', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))

    await expect(
      streamAIResponse({
        provider: 'lmstudio',
        baseUrl: 'http://localhost:1234/v1',
        apiKey: '',
        messages: [],
        model: 'local-model',
        onChunk: vi.fn(),
      }),
    ).rejects.toThrow('No response body')
  })
})
