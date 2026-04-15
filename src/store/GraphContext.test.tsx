import React, { createRef, forwardRef, useImperativeHandle } from 'react'
import { act, render, waitFor } from '@testing-library/react'
import { GraphProvider, useGraphStore } from './GraphContext'
import { createEmptyChatNode, createInitialNode } from '../types/graph'
import {
  deleteGraphRequest,
  fetchGraph,
  fetchGraphs,
  fetchModelsRequest,
  startGraphGenerationRequest,
  syncGraphRequest,
} from '../api/client'

vi.mock('../api/client', () => ({
  deleteGraphRequest: vi.fn(),
  fetchGraph: vi.fn(),
  fetchGraphs: vi.fn(),
  fetchModelsRequest: vi.fn(),
  startGraphGenerationRequest: vi.fn(),
  syncGraphRequest: vi.fn(),
}))

const mockedDeleteGraphRequest = vi.mocked(deleteGraphRequest)
const mockedFetchGraph = vi.mocked(fetchGraph)
const mockedFetchGraphs = vi.mocked(fetchGraphs)
const mockedFetchModelsRequest = vi.mocked(fetchModelsRequest)
const mockedStartGraphGenerationRequest = vi.mocked(startGraphGenerationRequest)
const mockedSyncGraphRequest = vi.mocked(syncGraphRequest)

function installLocalStorage() {
  const storage = new Map<string, string>()

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      clear: () => {
        storage.clear()
      },
    },
  })

  return storage
}

const Probe = forwardRef(function Probe(_, ref: React.ForwardedRef<ReturnType<typeof useGraphStore>>) {
  const store = useGraphStore()
  useImperativeHandle(ref, () => store)
  return null
})

describe('GraphContext', () => {
  let storage: Map<string, string>
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

  beforeEach(() => {
    vi.useRealTimers()
    storage = installLocalStorage()
    storage.clear()
    mockedFetchGraph.mockReset()
    mockedDeleteGraphRequest.mockReset()
    mockedFetchGraphs.mockReset()
    mockedFetchModelsRequest.mockReset()
    mockedStartGraphGenerationRequest.mockReset()
    mockedSyncGraphRequest.mockReset()
    mockedDeleteGraphRequest.mockResolvedValue(undefined)
    mockedFetchGraphs.mockResolvedValue({ items: [], nextCursor: null })
    consoleError.mockClear()
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('throws when used outside the provider', () => {
    expect(() => render(<Probe />)).toThrow('useGraphStore must be used inside GraphProvider')
  })

  it('loads a graph from the query string on mount', async () => {
    window.history.pushState({}, '', '/?id=remote-graph')
    mockedFetchGraphs.mockResolvedValueOnce({ items: [], nextCursor: null })
    mockedFetchGraph.mockResolvedValueOnce({
      id: 'remote-graph',
      title: 'Remote title',
      content: {
        nodes: [createEmptyChatNode('remote-node', { x: 10, y: 20 })],
        edges: [],
      },
    })

    const ref = createRef<ReturnType<typeof useGraphStore>>()
    render(
      <GraphProvider>
        <Probe ref={ref} />
      </GraphProvider>,
    )

    await waitFor(() => {
      expect(ref.current?.graphId).toBe('remote-graph')
      expect(ref.current?.graphTitle).toBe('Remote title')
      expect(ref.current?.nodes[0]?.id).toBe('remote-node')
    })
  })

  it('falls back to defaults when graph loading fails', async () => {
    window.history.pushState({}, '', '/?id=broken-graph')
    mockedFetchGraphs.mockResolvedValueOnce({ items: [], nextCursor: null })
    mockedFetchGraph.mockRejectedValueOnce(new Error('boom'))

    const ref = createRef<ReturnType<typeof useGraphStore>>()
    render(
      <GraphProvider>
        <Probe ref={ref} />
      </GraphProvider>,
    )

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled()
      expect(ref.current?.nodes).toHaveLength(1)
    })
  })

  it('restores the initial node when a loaded graph has no content', async () => {
    mockedFetchGraphs.mockResolvedValueOnce({ items: [], nextCursor: null })
    mockedFetchGraph.mockResolvedValueOnce({
      id: 'empty-graph',
      title: null,
      content: null,
    })

    const ref = createRef<ReturnType<typeof useGraphStore>>()
    render(
      <GraphProvider>
        <Probe ref={ref} />
      </GraphProvider>,
    )

    await act(async () => {
      await ref.current?.loadGraph('empty-graph')
    })

    expect(ref.current?.nodes).toEqual([createInitialNode()])
    expect(ref.current?.graphTitle).toBe('Untitled Graph')
  })

  it('updates persisted state, resets graphs, and restores the seed node when emptied', async () => {
    mockedFetchGraphs.mockResolvedValueOnce({ items: [], nextCursor: null })
    const ref = createRef<ReturnType<typeof useGraphStore>>()
    render(
      <GraphProvider>
        <Probe ref={ref} />
      </GraphProvider>,
    )

    act(() => {
      ref.current?.setSystemPrompt('New prompt')
      ref.current?.setAiProvider('openai')
      ref.current?.setLocalBaseUrl('http://localhost:9999/v1')
      ref.current?.setApiKey('secret')
      ref.current?.setModelName('gpt-4o')
      ref.current?.setActiveNode('1')
      ref.current?.setNodes([])
    })

    await waitFor(() => {
      expect(ref.current?.nodes).toHaveLength(1)
      expect(ref.current?.activeNodeId).toBeNull()
      expect(JSON.parse(storage.get('rabbit-system-prompt') ?? '""')).toBe('New prompt')
      expect(JSON.parse(storage.get('rabbit-ai-provider') ?? '""')).toBe('openai')
      expect(JSON.parse(storage.get('rabbit-model-name') ?? '""')).toBe('gpt-4o')
    })

    act(() => {
      ref.current?.resetGraph()
    })

    expect(ref.current?.edges).toEqual([])
    expect(ref.current?.nodes[0]).toEqual(createInitialNode())
  })

  it('updates user text in place and forks when editing a node with children', async () => {
    mockedFetchGraphs.mockResolvedValueOnce({ items: [], nextCursor: null })
    const ref = createRef<ReturnType<typeof useGraphStore>>()
    render(
      <GraphProvider>
        <Probe ref={ref} />
      </GraphProvider>,
    )

    act(() => {
      ref.current?.updateNodeUserText('1', 'Direct update')
    })

    expect(ref.current?.nodes[0]?.data.userText).toBe('Direct update')

    act(() => {
      ref.current?.setNodes([
        createInitialNode('root', { x: 0, y: 0 }),
        createEmptyChatNode('child', { x: 450, y: 0 }),
      ])
      ref.current?.setEdges([{ id: 'edge-root-child', source: 'root', target: 'child', type: 'smoothstep' }])
    })

    act(() => {
      ref.current?.updateNodeUserText('root', 'Forked path')
    })

    await waitFor(() => {
      expect(ref.current?.nodes).toHaveLength(3)
      expect(ref.current?.activeNodeId).not.toBeNull()
    })
  })

  it('updates preferred models, fetches model lists, and surfaces fetch errors', async () => {
    mockedFetchModelsRequest.mockResolvedValueOnce(['model-a', 'model-b'])
    mockedFetchModelsRequest.mockRejectedValueOnce(new Error('no models'))
    mockedFetchGraphs.mockResolvedValueOnce({ items: [], nextCursor: null })

    const ref = createRef<ReturnType<typeof useGraphStore>>()
    render(
      <GraphProvider>
        <Probe ref={ref} />
      </GraphProvider>,
    )

    act(() => {
      ref.current?.updateNodePreferredModel('1', 'model-a')
    })

    expect(ref.current?.nodes[0]?.data.preferredModel).toBe('model-a')

    await act(async () => {
      await ref.current?.fetchModels()
    })

    expect(ref.current?.availableModels).toEqual(['model-a', 'model-b'])

    await act(async () => {
      await ref.current?.fetchModels()
    })

    expect(ref.current?.fetchError).toBe('no models')
    expect(consoleError).toHaveBeenCalled()
  })

  it('defaults LM Studio model names and replaces invalid selections after fetching models', async () => {
    mockedFetchModelsRequest.mockResolvedValueOnce(['model-a', 'model-b'])
    mockedFetchGraphs.mockResolvedValueOnce({ items: [], nextCursor: null })

    const ref = createRef<ReturnType<typeof useGraphStore>>()
    render(
      <GraphProvider>
        <Probe ref={ref} />
      </GraphProvider>,
    )

    await waitFor(() => {
      expect(ref.current?.modelName).toBe('local-model')
      expect(ref.current?.aiProvider).toBe('lmstudio')
    })

    act(() => {
      ref.current?.setModelName('missing-model')
    })

    await act(async () => {
      await ref.current?.fetchModels()
    })

    expect(ref.current?.availableModels).toEqual(['model-a', 'model-b'])
    expect(ref.current?.modelName).toBe('model-a')
  })

  it('uses provider-specific fallback models for OpenRouter and Anthropic generations', async () => {
    mockedFetchGraphs.mockResolvedValueOnce({ items: [], nextCursor: null })
    mockedStartGraphGenerationRequest.mockResolvedValue({ started: true })

    const ref = createRef<ReturnType<typeof useGraphStore>>()
    render(
      <GraphProvider>
        <Probe ref={ref} />
      </GraphProvider>,
    )

    await waitFor(() => {
      expect(ref.current?.graphId).toBeTruthy()
    })

    act(() => {
      ref.current?.setAiProvider('openrouter')
      ref.current?.setModelName('')
    })

    await act(async () => {
      await ref.current?.generateAIResponse('1')
    })

    expect(mockedStartGraphGenerationRequest).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        provider: 'openrouter',
        model: 'gpt-4o',
      }),
    )

    act(() => {
      ref.current?.setAiProvider('anthropic')
      ref.current?.setModelName('')
    })

    await act(async () => {
      await ref.current?.generateAIResponse('1')
    })

    expect(mockedStartGraphGenerationRequest).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        provider: 'anthropic',
        model: 'claude-3-5-haiku-latest',
      }),
    )
  })

  it('starts background generation and reloads session progress', async () => {
    storage.set('rabbit-active-graph-id', JSON.stringify('g1'))
    mockedFetchGraphs.mockResolvedValueOnce({
      items: [{ id: 'g1', title: 'Graph 1', updatedAt: '2026-04-14T03:00:00.000Z' }],
      nextCursor: null,
    })
    mockedStartGraphGenerationRequest.mockResolvedValueOnce({ started: true })
    mockedFetchGraph
      .mockResolvedValueOnce({
        id: 'g1',
        title: 'Graph 1',
        updatedAt: '2026-04-14T02:59:00.000Z',
        content: {
          nodes: [createInitialNode('1', { x: 0, y: 0 })],
          edges: [],
        },
      })
      .mockResolvedValueOnce({
        id: 'g1',
        title: 'Graph 1',
        updatedAt: '2026-04-14T03:00:00.000Z',
        content: {
          nodes: [
            {
              ...createInitialNode('1', { x: 0, y: 0 }),
              data: {
                ...createInitialNode('1', { x: 0, y: 0 }).data,
                generationStatus: 'running',
              },
            },
          ],
          edges: [],
        },
      })
      .mockResolvedValueOnce({
        id: 'g1',
        title: 'Graph 1',
        updatedAt: '2026-04-14T03:01:00.000Z',
        content: {
          nodes: [
            {
              ...createInitialNode('1', { x: 0, y: 0 }),
              data: {
                ...createInitialNode('1', { x: 0, y: 0 }).data,
                aiText: 'Hello world',
                generationStatus: 'complete',
                tokens: 3,
              },
            },
          ],
          edges: [],
        },
      })

    const ref = createRef<ReturnType<typeof useGraphStore>>()
    render(
      <GraphProvider>
        <Probe ref={ref} />
      </GraphProvider>,
    )

    await waitFor(() => {
      expect(ref.current?.graphId).toBe('g1')
    })

    await act(async () => {
      await ref.current?.generateAIResponse('1')
    })

    await waitFor(() => {
      expect(mockedStartGraphGenerationRequest).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({
          nodeId: '1',
        }),
      )
      expect(ref.current?.nodes[0]?.data.aiText).toBe('Hello world')
      expect(ref.current?.nodes[0]?.data.generationStatus).toBe('complete')
    }, { timeout: 3000 })
  })

  it('loads paginated sessions, switches sessions, and restores the stored active session id', async () => {
    storage.set('rabbit-active-graph-id', JSON.stringify('g2'))
    mockedFetchGraphs
      .mockResolvedValueOnce({
        items: [{ id: 'g2', title: 'Stored session', updatedAt: '2026-04-14T03:00:00.000Z' }],
        nextCursor: 'cursor-2',
      })
      .mockResolvedValueOnce({
        items: [{ id: 'g1', title: 'Older session', updatedAt: '2026-04-14T01:00:00.000Z' }],
        nextCursor: null,
      })
    mockedFetchGraph
      .mockResolvedValueOnce({
        id: 'g2',
        title: 'Stored session',
        updatedAt: '2026-04-14T03:00:00.000Z',
        content: {
          nodes: [createEmptyChatNode('g2-node', { x: 10, y: 20 })],
          edges: [],
        },
      })
      .mockResolvedValueOnce({
        id: 'g1',
        title: 'Older session',
        updatedAt: '2026-04-14T01:00:00.000Z',
        content: {
          nodes: [createEmptyChatNode('g1-node', { x: 30, y: 40 })],
          edges: [],
        },
      })

    const ref = createRef<ReturnType<typeof useGraphStore>>()
    render(
      <GraphProvider>
        <Probe ref={ref} />
      </GraphProvider>,
    )

    await waitFor(() => {
      expect(ref.current?.graphId).toBe('g2')
      expect(ref.current?.sessions).toContainEqual({ id: 'g2', title: 'Stored session', updatedAt: '2026-04-14T03:00:00.000Z' })
    })

    await act(async () => {
      await ref.current?.loadMoreSessions()
    })

    await act(async () => {
      await ref.current?.loadGraph('g1')
    })

    expect(ref.current?.sessions).toContainEqual({ id: 'g2', title: 'Stored session', updatedAt: '2026-04-14T03:00:00.000Z' })
    expect(ref.current?.sessions).toContainEqual({ id: 'g1', title: 'Older session', updatedAt: '2026-04-14T01:00:00.000Z' })
    expect(JSON.parse(storage.get('rabbit-active-graph-id') ?? 'null')).toBe('g1')
  })

  it('deletes sessions and falls back to another stored session or a new graph', async () => {
    storage.set('rabbit-active-graph-id', JSON.stringify('g2'))
    mockedFetchGraphs.mockResolvedValueOnce({
      items: [
        { id: 'g2', title: 'Current', updatedAt: '2026-04-14T03:00:00.000Z' },
        { id: 'g1', title: 'Older', updatedAt: '2026-04-14T02:00:00.000Z' },
      ],
      nextCursor: null,
    })
    mockedFetchGraph
      .mockResolvedValueOnce({
        id: 'g2',
        title: 'Current',
        updatedAt: '2026-04-14T03:00:00.000Z',
        content: { nodes: [createEmptyChatNode('g2-node', { x: 10, y: 20 })], edges: [] },
      })
      .mockResolvedValueOnce({
        id: 'g1',
        title: 'Older',
        updatedAt: '2026-04-14T02:00:00.000Z',
        content: { nodes: [createEmptyChatNode('g1-node', { x: 30, y: 40 })], edges: [] },
      })

    const ref = createRef<ReturnType<typeof useGraphStore>>()
    render(
      <GraphProvider>
        <Probe ref={ref} />
      </GraphProvider>,
    )

    await waitFor(() => {
      expect(ref.current?.graphId).toBe('g2')
    })

    await act(async () => {
      await ref.current?.deleteGraph('g2')
    })

    expect(mockedDeleteGraphRequest).toHaveBeenCalledWith('g2')
    await waitFor(() => {
      expect(ref.current?.graphId).toBe('g1')
      expect(ref.current?.sessions.map((session) => session.id)).toEqual(['g1'])
    })

    await act(async () => {
      await ref.current?.deleteGraph('g1')
    })

    expect(mockedDeleteGraphRequest).toHaveBeenCalledWith('g1')
    await waitFor(() => {
      expect(ref.current?.graphId).not.toBe('g1')
      expect(ref.current?.nodes).toEqual([createInitialNode()])
      expect(ref.current?.sessions).toHaveLength(1)
    })
  })

  it('syncs manually, auto-syncs after idle time, and reports sync failures', async () => {
    vi.useFakeTimers()
    mockedFetchGraphs.mockResolvedValueOnce({ items: [], nextCursor: null })
    mockedSyncGraphRequest.mockResolvedValueOnce(undefined)
    mockedSyncGraphRequest.mockRejectedValueOnce(new Error('sync failed'))

    const ref = createRef<ReturnType<typeof useGraphStore>>()
    render(
      <GraphProvider>
        <Probe ref={ref} />
      </GraphProvider>,
    )

    await act(async () => {
      await ref.current?.syncGraph()
    })

    expect(ref.current?.lastSyncedAt).toBeInstanceOf(Date)

    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    expect(consoleError).toHaveBeenCalled()

    vi.useRealTimers()
  }, 10000)
})
