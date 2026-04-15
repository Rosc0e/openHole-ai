import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import {
  deleteGraphRequest,
  fetchGraph,
  fetchGraphs,
  fetchModelsRequest,
  startGraphGenerationRequest,
  syncGraphRequest,
} from '../api/client'
import { readStoredValue, writeStoredValue } from '../lib/storage'
import { buildContextMessages, estimateTokens, updateNodeUserTextState } from './graph-logic'
import {
  createInitialNode,
  getDefaultBaseUrlForProvider,
  getDefaultModelForProvider,
  type AIProvider,
  type ChatEdge,
  type ChatMessage,
  type ChatNode,
  type SessionListItem,
  type StoredGraph,
} from '../types/graph'

const STORAGE_KEYS = {
  activeGraphId: 'rabbit-active-graph-id',
  systemPrompt: 'rabbit-system-prompt',
  aiProvider: 'rabbit-ai-provider',
  localBaseUrl: 'rabbit-local-base-url',
  apiKey: 'rabbit-api-key',
  modelName: 'rabbit-model-name',
} as const

const SESSION_PAGE_SIZE = 10

interface GraphStoreValue {
  nodes: ChatNode[]
  edges: ChatEdge[]
  activeNodeId: string | null
  activeNode: ChatNode | null
  graphId: string
  graphTitle: string
  sessions: SessionListItem[]
  sessionsHasMore: boolean
  isLoadingSessions: boolean
  isSyncing: boolean
  lastSyncedAt: Date | null
  systemPrompt: string
  aiProvider: AIProvider
  localBaseUrl: string
  apiKey: string
  modelName: string
  availableModels: string[]
  isFetchingModels: boolean
  fetchError: string | null
  setNodes: Dispatch<SetStateAction<ChatNode[]>>
  setEdges: Dispatch<SetStateAction<ChatEdge[]>>
  setActiveNode: (id: string | null) => void
  setSystemPrompt: (value: string) => void
  setAiProvider: (value: AIProvider) => void
  setLocalBaseUrl: (value: string) => void
  setApiKey: (value: string) => void
  setModelName: (value: string) => void
  addNode: (node: ChatNode) => void
  resetGraph: () => void
  updateNodeUserText: (nodeId: string, text: string) => void
  updateNodePreferredModel: (nodeId: string, model: string | null) => void
  generateAIResponse: (nodeId: string) => Promise<void>
  syncGraph: () => Promise<void>
  loadGraph: (id: string) => Promise<void>
  deleteGraph: (id: string) => Promise<void>
  loadMoreSessions: () => Promise<void>
  fetchModels: () => Promise<void>
}

const GraphContext = createContext<GraphStoreValue | null>(null)

function mergeSessions(current: SessionListItem[], incoming: SessionListItem[]) {
  const map = new Map<string, SessionListItem>()

  for (const item of [...current, ...incoming]) {
    map.set(item.id, item)
  }

  return [...map.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

function upsertSession(current: SessionListItem[], session: SessionListItem) {
  return mergeSessions(current.filter((item) => item.id !== session.id), [session])
}

function normalizeGraphTitle(title: string | null | undefined) {
  return title?.trim() || 'Untitled Graph'
}

export function GraphProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<ChatNode[]>([createInitialNode()])
  const [edges, setEdges] = useState<ChatEdge[]>([])
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [graphId, setGraphId] = useState<string>(() => readStoredValue(STORAGE_KEYS.activeGraphId, crypto.randomUUID()))
  const [graphTitle, setGraphTitle] = useState<string>('Untitled Graph')
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [sessionsCursor, setSessionsCursor] = useState<string | null>(null)
  const [sessionsHasMore, setSessionsHasMore] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [systemPrompt, setSystemPrompt] = useState<string>(() =>
    readStoredValue(STORAGE_KEYS.systemPrompt, 'You are a helpful AI assistant.'),
  )
  const [aiProvider, setAiProvider] = useState<AIProvider>(() => readStoredValue(STORAGE_KEYS.aiProvider, 'lmstudio'))
  const [localBaseUrl, setLocalBaseUrl] = useState<string>(() =>
    readStoredValue(STORAGE_KEYS.localBaseUrl, getDefaultBaseUrlForProvider('lmstudio')),
  )
  const [apiKey, setApiKey] = useState<string>(() => readStoredValue(STORAGE_KEYS.apiKey, ''))
  const [modelName, setModelName] = useState<string>(() => readStoredValue(STORAGE_KEYS.modelName, ''))
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const didInitialize = useRef(false)

  const activeNode = useMemo(
    () => nodes.find((node) => node.id === activeNodeId) ?? null,
    [activeNodeId, nodes],
  )

  const applyGraphState = useCallback((data: StoredGraph, options?: { preserveActiveNode?: boolean }) => {
    const content = data.content
    const nextNodes = content?.nodes?.length ? content.nodes : [createInitialNode()]
    const nextEdges = content?.edges ?? []
    const nextTitle = normalizeGraphTitle(data.title)

    setNodes(nextNodes)
    setEdges(nextEdges)
    setGraphId(data.id)
    setGraphTitle(nextTitle)
    setSessions((current) =>
      upsertSession(current, {
        id: data.id,
        title: nextTitle,
        updatedAt: new Date(data.updatedAt ?? Date.now()).toISOString(),
      }),
    )
    setActiveNodeId((current) => {
      if (options?.preserveActiveNode && current && nextNodes.some((node) => node.id === current)) {
        return current
      }

      return null
    })
  }, [])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.activeGraphId, graphId)
  }, [graphId])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.systemPrompt, systemPrompt)
  }, [systemPrompt])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.aiProvider, aiProvider)
  }, [aiProvider])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.localBaseUrl, localBaseUrl)
  }, [localBaseUrl])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.apiKey, apiKey)
  }, [apiKey])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.modelName, modelName)
  }, [modelName])

  useEffect(() => {
    if (!modelName.trim()) {
      setModelName(getDefaultModelForProvider(aiProvider))
    }
  }, [aiProvider, modelName])

  useEffect(() => {
    const lmStudioDefaultBaseUrl = getDefaultBaseUrlForProvider('lmstudio')

    if (aiProvider === 'lmstudio' && !localBaseUrl.trim()) {
      setLocalBaseUrl(lmStudioDefaultBaseUrl)
      return
    }

    if (aiProvider !== 'lmstudio' && localBaseUrl.trim() === lmStudioDefaultBaseUrl) {
      setLocalBaseUrl('')
    }
  }, [aiProvider, localBaseUrl])

  useEffect(() => {
    if (nodes.length === 0) {
      setNodes([createInitialNode()])
    }
  }, [nodes.length])

  useEffect(() => {
    if (!activeNodeId) {
      return
    }

    if (!nodes.some((node) => node.id === activeNodeId)) {
      setActiveNodeId(null)
    }
  }, [activeNodeId, nodes])

  const addNode = useCallback((node: ChatNode) => {
    setNodes((currentNodes) => [...currentNodes, node])
  }, [])

  const setActiveNode = useCallback((id: string | null) => {
    setActiveNodeId(id)
  }, [])

  const loadSessionsPage = useCallback(async (cursor?: string | null) => {
    if (isLoadingSessions) {
      return
    }

    setIsLoadingSessions(true)

    try {
      const response = await fetchGraphs({ limit: SESSION_PAGE_SIZE, cursor: cursor ?? undefined })

      setSessions((current) => mergeSessions(current, response.items))
      setSessionsCursor(response.nextCursor)
      setSessionsHasMore(Boolean(response.nextCursor))
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setIsLoadingSessions(false)
    }
  }, [isLoadingSessions])

  const loadGraph = useCallback(
    async (id: string) => {
      try {
        const data = await fetchGraph(id)
        applyGraphState(data)
      } catch (error) {
        console.error('Failed to load graph:', error)
      }
    },
    [applyGraphState],
  )

  const loadMoreSessions = useCallback(async () => {
    if (!sessionsCursor) {
      return
    }

    await loadSessionsPage(sessionsCursor)
  }, [loadSessionsPage, sessionsCursor])

  const resetGraph = useCallback(() => {
    const nextGraphId = crypto.randomUUID()
    const nextNodes = [createInitialNode()]
    const nextEdges: ChatEdge[] = []
    const nextTitle = 'Untitled Graph'
    const updatedAt = new Date().toISOString()

    setNodes(nextNodes)
    setEdges(nextEdges)
    setActiveNodeId(null)
    setGraphId(nextGraphId)
    setGraphTitle(nextTitle)
    setSessions((current) =>
      upsertSession(current, {
        id: nextGraphId,
        title: nextTitle,
        updatedAt,
      }),
    )

    Promise.resolve(
      syncGraphRequest({
        id: nextGraphId,
        title: nextTitle,
        content: {
          nodes: nextNodes,
          edges: nextEdges,
        },
      }),
    ).catch((error) => {
      console.error('Failed to create graph:', error)
    })
  }, [])

  const deleteGraph = useCallback(
    async (id: string) => {
      try {
        await deleteGraphRequest(id)

        const remainingSessions = sessions.filter((session) => session.id !== id)
        setSessions(remainingSessions)

        if (id !== graphId) {
          return
        }

        const nextSession = remainingSessions[0]

        if (nextSession) {
          await loadGraph(nextSession.id)
          return
        }

        resetGraph()
      } catch (error) {
        console.error('Failed to delete graph:', error)
      }
    },
    [graphId, loadGraph, resetGraph, sessions],
  )

  const updateNodeUserText = useCallback(
    (nodeId: string, text: string) => {
      const result = updateNodeUserTextState(nodes, edges, nodeId, text, () => crypto.randomUUID())

      if (!result) {
        return
      }

      setNodes(result.nodes)
      setEdges(result.edges)

      if (result.activeNodeId) {
        setActiveNodeId(result.activeNodeId)
      }
    },
    [edges, nodes],
  )

  const updateNodePreferredModel = useCallback((nodeId: string, model: string | null) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                preferredModel: model,
              },
            }
          : node,
      ),
    )
  }, [])

  const buildContext = useCallback(
    (nodeId: string, options?: { includeCurrentAssistant?: boolean }): ChatMessage[] => {
      return buildContextMessages(nodes, edges, nodeId, systemPrompt, options)
    },
    [edges, nodes, systemPrompt],
  )

  const generateAIResponse = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((entry) => entry.id === nodeId)
      if (!node) {
        return
      }

      const messages = buildContext(nodeId, { includeCurrentAssistant: false })
      const modelToUse = (node.data.preferredModel || modelName).trim()
      const fallbackModel = getDefaultModelForProvider(aiProvider)
      const resolvedModel = modelToUse || fallbackModel

      setNodes((currentNodes) =>
        currentNodes.map((entry) =>
          entry.id === nodeId
            ? {
                ...entry,
                data: {
                  ...entry.data,
                  aiText: '',
                  tokens: 0,
                  model: resolvedModel,
                  generationError: null,
                  generationStatus: 'running',
                },
              }
            : entry,
        ),
      )

      try {
        await startGraphGenerationRequest(graphId, {
          nodeId,
          provider: aiProvider,
          baseUrl: localBaseUrl,
          apiKey,
          messages,
          model: resolvedModel,
        })
      } catch (error) {
        console.error('Error generating AI response:', error)
        setNodes((currentNodes) =>
          currentNodes.map((entry) =>
            entry.id === nodeId
              ? {
                  ...entry,
                  data: {
                    ...entry.data,
                    aiText: 'Error generating response.',
                    generationStatus: 'error',
                  },
                }
              : entry,
          ),
        )
      }
    },
    [aiProvider, apiKey, buildContext, graphId, localBaseUrl, modelName, nodes],
  )

  const syncGraph = useCallback(async () => {
    if (isSyncing) {
      return
    }

    setIsSyncing(true)

    try {
      await syncGraphRequest({
        id: graphId,
        title: graphTitle,
        content: {
          nodes,
          edges,
        },
      })

      const updatedAt = new Date()

      setLastSyncedAt(updatedAt)
      setSessions((current) =>
        upsertSession(current, {
          id: graphId,
          title: graphTitle,
          updatedAt: updatedAt.toISOString(),
        }),
      )
    } catch (error) {
      console.error('Failed to sync graph:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [edges, graphId, graphTitle, isSyncing, nodes])

  const fetchModels = useCallback(async () => {
    if (isFetchingModels) {
      return
    }

    setIsFetchingModels(true)
    setFetchError(null)

    try {
      const models = await fetchModelsRequest({
        provider: aiProvider,
        baseUrl: localBaseUrl,
        apiKey,
      })

      setAvailableModels(models)
      const trimmedModelName = modelName.trim()

      if (models.length > 0 && (!trimmedModelName || !models.includes(trimmedModelName))) {
        setModelName(models[0] ?? '')
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
      setFetchError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsFetchingModels(false)
    }
  }, [aiProvider, apiKey, isFetchingModels, localBaseUrl, modelName])

  useEffect(() => {
    if (didInitialize.current) {
      return
    }

    didInitialize.current = true
    const queryId = new URLSearchParams(window.location.search).get('id')
    const storedId = readStoredValue<string | null>(STORAGE_KEYS.activeGraphId, null)
    const initialId = queryId || storedId

    void loadSessionsPage(null)

    if (initialId) {
      void loadGraph(initialId)
    }
  }, [loadGraph, loadSessionsPage])

  const hasRunningGeneration = useMemo(
    () => nodes.some((node) => node.data.generationStatus === 'running'),
    [nodes],
  )

  useEffect(() => {
    if (!hasRunningGeneration) {
      return
    }

    const interval = window.setInterval(() => {
      void fetchGraph(graphId)
        .then((data) => {
          applyGraphState(data, { preserveActiveNode: true })
        })
        .catch((error) => {
          console.error('Failed to refresh graph:', error)
        })
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [applyGraphState, graphId, hasRunningGeneration])

  const syncSignature = useMemo(() => JSON.stringify({ nodes, edges }), [edges, nodes])

  useEffect(() => {
    if (hasRunningGeneration) {
      return
    }

    const timeout = window.setTimeout(() => {
      void syncGraph()
    }, 5000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [hasRunningGeneration, syncGraph, syncSignature])

  const value = useMemo<GraphStoreValue>(
    () => ({
      nodes,
      edges,
      activeNodeId,
      activeNode,
      graphId,
      graphTitle,
      sessions,
      sessionsHasMore,
      isLoadingSessions,
      isSyncing,
      lastSyncedAt,
      systemPrompt,
      aiProvider,
      localBaseUrl,
      apiKey,
      modelName,
      availableModels,
      isFetchingModels,
      fetchError,
      setNodes,
      setEdges,
      setActiveNode,
      setSystemPrompt,
      setAiProvider,
      setLocalBaseUrl,
      setApiKey,
      setModelName,
      addNode,
      resetGraph,
      updateNodeUserText,
      updateNodePreferredModel,
      generateAIResponse,
      syncGraph,
      loadGraph,
      deleteGraph,
      loadMoreSessions,
      fetchModels,
    }),
    [
      activeNode,
      activeNodeId,
      addNode,
      aiProvider,
      apiKey,
      availableModels,
      edges,
      fetchError,
      fetchModels,
      generateAIResponse,
      graphId,
      graphTitle,
      isFetchingModels,
      isLoadingSessions,
      isSyncing,
      lastSyncedAt,
      deleteGraph,
      loadGraph,
      loadMoreSessions,
      localBaseUrl,
      modelName,
      nodes,
      resetGraph,
      sessions,
      sessionsHasMore,
      setActiveNode,
      syncGraph,
      systemPrompt,
      updateNodePreferredModel,
      updateNodeUserText,
    ],
  )

  return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>
}

export function useGraphStore() {
  const value = useContext(GraphContext)

  if (!value) {
    throw new Error('useGraphStore must be used inside GraphProvider')
  }

  return value
}
