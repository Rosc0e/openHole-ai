import { fetchGraph, fetchModelsRequest, streamAIResponse, syncGraphRequest } from './client'

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

  it('fetches local models directly', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: 'model-a' }, { id: 'model-b' }] }), { status: 200 }),
    )

    await expect(
      fetchModelsRequest({ provider: 'local', baseUrl: 'http://localhost:1234/v1/', apiKey: '' }),
    ).resolves.toEqual(['model-a', 'model-b'])
  })

  it('throws on local model fetch failure', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500, statusText: 'Bad' }))

    await expect(
      fetchModelsRequest({ provider: 'local', baseUrl: 'http://localhost:1234/v1/', apiKey: '' }),
    ).rejects.toThrow('Failed to fetch models: Bad')
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

  it('streams local ai responses from SSE payloads', async () => {
    const chunks: string[] = []
    fetchMock.mockResolvedValueOnce(
      new Response(createTextStream(['data: {"choices":[{"delta":{"content":"Hello"}}]}\n', 'data: [DONE]\n']), {
        status: 200,
      }),
    )

    await streamAIResponse({
      provider: 'local',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: '',
      messages: [{ role: 'user', content: 'Hi' }],
      model: 'local-model',
      onChunk: (chunk) => chunks.push(chunk),
    })

    expect(chunks).toEqual(['Hello'])
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

  it('throws when local streaming responses are invalid', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))

    await expect(
      streamAIResponse({
        provider: 'local',
        baseUrl: 'http://localhost:1234/v1',
        apiKey: '',
        messages: [],
        model: 'local-model',
        onChunk: vi.fn(),
      }),
    ).rejects.toThrow('No response body')
  })
})
