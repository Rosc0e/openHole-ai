import React, { createRef, forwardRef, useImperativeHandle } from 'react'
import { act, render, waitFor } from '@testing-library/react'
import { GraphProvider, useGraphStore } from './GraphContext'
import { createEmptyChatNode, createInitialNode } from '../types/graph'
import { fetchGraph, fetchModelsRequest, streamAIResponse, syncGraphRequest } from '../api/client'

vi.mock('../api/client', () => ({
  fetchGraph: vi.fn(),
  fetchModelsRequest: vi.fn(),
  streamAIResponse: vi.fn(),
  syncGraphRequest: vi.fn(),
}))

const mockedFetchGraph = vi.mocked(fetchGraph)
const mockedFetchModelsRequest = vi.mocked(fetchModelsRequest)
const mockedStreamAIResponse = vi.mocked(streamAIResponse)
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
    storage = installLocalStorage()
    storage.clear()
    mockedFetchGraph.mockReset()
    mockedFetchModelsRequest.mockReset()
    mockedStreamAIResponse.mockReset()
    mockedSyncGraphRequest.mockReset()
    consoleError.mockClear()
    window.history.pushState({}, '', '/')
  })

  it('throws when used outside the provider', () => {
    expect(() => render(<Probe />)).toThrow('useGraphStore must be used inside GraphProvider')
  })

  it('loads a graph from the query string on mount', async () => {
    window.history.pushState({}, '', '/?id=remote-graph')
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

  it('streams ai responses and writes error fallback text on failure', async () => {
    mockedStreamAIResponse.mockImplementationOnce(async ({ onChunk }) => {
      onChunk('Hello')
      onChunk(' world')
    })
    mockedStreamAIResponse.mockRejectedValueOnce(new Error('generation failed'))

    const ref = createRef<ReturnType<typeof useGraphStore>>()
    render(
      <GraphProvider>
        <Probe ref={ref} />
      </GraphProvider>,
    )

    act(() => {
      ref.current?.setNodes([createInitialNode('1', { x: 0, y: 0 }), createEmptyChatNode('2', { x: 450, y: 0 })])
    })

    await act(async () => {
      await ref.current?.generateAIResponse('1')
    })

    expect(ref.current?.nodes[0]?.data.aiText).toBe('Hello world')
    expect(ref.current?.nodes[0]?.data.tokens).toBe(3)
    expect(ref.current?.nodes[1]?.data.aiText).toBe('')

    await act(async () => {
      await ref.current?.generateAIResponse('missing-node')
    })

    await act(async () => {
      await ref.current?.generateAIResponse('1')
    })

    expect(ref.current?.nodes[0]?.data.aiText).toBe('Error generating response.')
    expect(consoleError).toHaveBeenCalled()
  })

  it('syncs manually, auto-syncs after idle time, and reports sync failures', async () => {
    vi.useFakeTimers()
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
