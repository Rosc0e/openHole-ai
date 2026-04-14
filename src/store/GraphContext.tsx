import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { fetchGraph, fetchModelsRequest, streamAIResponse, syncGraphRequest } from '../api/client'
import { readStoredValue, writeStoredValue } from '../lib/storage'
import { buildContextMessages, estimateTokens, updateNodeUserTextState } from './graph-logic'
import {
  createEmptyChatNode,
  createInitialNode,
  type AIProvider,
  type ChatEdge,
  type ChatMessage,
  type ChatNode,
} from '../types/graph'

const STORAGE_KEYS = {
  nodes: 'rabbit-nodes',
  edges: 'rabbit-edges',
  graphId: 'rabbit-graph-id',
  graphTitle: 'rabbit-graph-title',
  systemPrompt: 'rabbit-system-prompt',
  aiProvider: 'rabbit-ai-provider',
  localBaseUrl: 'rabbit-local-base-url',
  apiKey: 'rabbit-api-key',
  modelName: 'rabbit-model-name',
} as const

interface GraphStoreValue {
  nodes: ChatNode[]
  edges: ChatEdge[]
  activeNodeId: string | null
  activeNode: ChatNode | null
  graphId: string
  graphTitle: string
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
  fetchModels: () => Promise<void>
}

const GraphContext = createContext<GraphStoreValue | null>(null)

export function GraphProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<ChatNode[]>(() =>
    readStoredValue(STORAGE_KEYS.nodes, [createInitialNode()]),
  )
  const [edges, setEdges] = useState<ChatEdge[]>(() => readStoredValue(STORAGE_KEYS.edges, []))
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [graphId, setGraphId] = useState<string>(() =>
    readStoredValue(STORAGE_KEYS.graphId, crypto.randomUUID()),
  )
  const [graphTitle, setGraphTitle] = useState<string>(() =>
    readStoredValue(STORAGE_KEYS.graphTitle, 'Untitled Graph'),
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [systemPrompt, setSystemPrompt] = useState<string>(() =>
    readStoredValue(STORAGE_KEYS.systemPrompt, 'You are a helpful AI assistant.'),
  )
  const [aiProvider, setAiProvider] = useState<AIProvider>(() =>
    readStoredValue(STORAGE_KEYS.aiProvider, 'local'),
  )
  const [localBaseUrl, setLocalBaseUrl] = useState<string>(() =>
    readStoredValue(STORAGE_KEYS.localBaseUrl, 'http://localhost:1234/v1'),
  )
  const [apiKey, setApiKey] = useState<string>(() => readStoredValue(STORAGE_KEYS.apiKey, ''))
  const [modelName, setModelName] = useState<string>(() => readStoredValue(STORAGE_KEYS.modelName, ''))
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const activeNode = useMemo(
    () => nodes.find((node) => node.id === activeNodeId) ?? null,
    [activeNodeId, nodes],
  )

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.nodes, nodes)
  }, [nodes])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.edges, edges)
  }, [edges])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.graphId, graphId)
  }, [graphId])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.graphTitle, graphTitle)
  }, [graphTitle])

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

  const resetGraph = useCallback(() => {
    setNodes([createInitialNode()])
    setEdges([])
    setActiveNodeId(null)
  }, [])

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
    (nodeId: string): ChatMessage[] => {
      return buildContextMessages(nodes, edges, nodeId, systemPrompt)
    },
    [edges, nodes, systemPrompt],
  )

  const generateAIResponse = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((entry) => entry.id === nodeId)
      if (!node) {
        return
      }

      const messages = buildContext(nodeId)
      const modelToUse = node.data.preferredModel || modelName

      setNodes((currentNodes) =>
        currentNodes.map((entry) =>
          entry.id === nodeId
            ? {
                ...entry,
                data: {
                  ...entry.data,
                  aiText: '',
                  tokens: 0,
                  model: modelToUse,
                },
              }
            : entry,
        ),
      )

      try {
        await streamAIResponse({
          provider: aiProvider,
          baseUrl: localBaseUrl,
          apiKey,
          messages,
          model: modelToUse || (aiProvider === 'local' ? 'local-model' : 'gpt-4o'),
          onChunk: (chunk) => {
            setNodes((currentNodes) =>
              currentNodes.map((entry) => {
                if (entry.id !== nodeId) {
                  return entry
                }

                const aiText = `${entry.data.aiText}${chunk}`

                return {
                  ...entry,
                  data: {
                    ...entry.data,
                    aiText,
                    tokens: estimateTokens(aiText),
                  },
                }
              }),
            )
          },
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
                  },
                }
              : entry,
          ),
        )
      }
    },
    [aiProvider, apiKey, buildContext, localBaseUrl, modelName, nodes],
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

      setLastSyncedAt(new Date())
    } catch (error) {
      console.error('Failed to sync graph:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [edges, graphId, graphTitle, isSyncing, nodes])

  const loadGraph = useCallback(async (id: string) => {
    try {
      const data = await fetchGraph(id)
      const content = data.content

      setNodes(content?.nodes?.length ? content.nodes : [createInitialNode()])
      setEdges(content?.edges ?? [])
      setGraphId(data.id)
      setGraphTitle(data.title || 'Untitled Graph')
      setActiveNodeId(null)
    } catch (error) {
      console.error('Failed to load graph:', error)
    }
  }, [])

  const fetchModels = useCallback(async () => {
    if (isFetchingModels) {
      return
    }

    setIsFetchingModels(true)
    setFetchError(null)
    setAvailableModels([])

    try {
      const models = await fetchModelsRequest({
        provider: aiProvider,
        baseUrl: localBaseUrl,
        apiKey,
      })

      setAvailableModels(models)
    } catch (error) {
      console.error('Failed to fetch models:', error)
      setFetchError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsFetchingModels(false)
    }
  }, [aiProvider, apiKey, isFetchingModels, localBaseUrl])

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')

    if (id) {
      void loadGraph(id)
    }
  }, [loadGraph])

  const syncSignature = useMemo(() => JSON.stringify({ nodes, edges }), [edges, nodes])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void syncGraph()
    }, 5000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [syncGraph, syncSignature])

  const value = useMemo<GraphStoreValue>(
    () => ({
      nodes,
      edges,
      activeNodeId,
      activeNode,
      graphId,
      graphTitle,
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
      isSyncing,
      lastSyncedAt,
      loadGraph,
      localBaseUrl,
      modelName,
      nodes,
      resetGraph,
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
