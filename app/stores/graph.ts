import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'

export const useGraphStore = defineStore('graph', () => {
  const nodes = useStorage<Node[]>('rabbit-nodes', [
    {
      id: '1',
      type: 'chatPair',
      position: { x: 250, y: 5 },
      data: { userText: 'Hello world', aiText: 'Hi there! How can I help you today?' }
    }
  ])
  const edges = useStorage<Edge[]>('rabbit-edges', [])
  const activeNodeId = ref<string | null>(null)
  const graphId = useStorage('rabbit-graph-id', crypto.randomUUID())
  const graphTitle = useStorage('rabbit-graph-title', 'Untitled Graph')
  const isSyncing = ref(false)
  const lastSyncedAt = ref<Date | null>(null)

  // Global Settings
  const systemPrompt = useStorage('rabbit-system-prompt', 'You are a helpful AI assistant.')
  const aiProvider = useStorage<'openai' | 'local'>('rabbit-ai-provider', 'local')
  const localBaseUrl = useStorage('rabbit-local-base-url', 'http://localhost:1234/v1')
  const apiKey = useStorage('rabbit-api-key', '')
  const modelName = useStorage('rabbit-model-name', '')
  const availableModels = ref<string[]>([])
  const isFetchingModels = ref(false)
  const fetchError = ref<string | null>(null)

  function addNode(node: Node) {
    nodes.value.push(node)
  }

  function setActiveNode(id: string | null) {
    activeNodeId.value = id
  }

  function forkNode(originalNodeId: string, newText: string) {
    const originalNode = nodes.value.find(n => n.id === originalNodeId)
    if (!originalNode) return

    // Find all siblings (nodes that share the same parent)
    const parentEdge = edges.value.find(e => e.target === originalNodeId)
    let siblingCount = 0
    if (parentEdge) {
      siblingCount = edges.value.filter(e => e.source === parentEdge.source).length
    }

    const newNodeId = crypto.randomUUID()
    const newNode: Node = {
      id: newNodeId,
      type: 'chatPair',
      // Offset based on sibling count to avoid overlap
      position: { 
        x: originalNode.position.x + 450, // Move right
        y: originalNode.position.y + (siblingCount * 100) // Move down based on siblings
      },
      data: { ...originalNode.data, userText: newText, aiText: '', tokens: 0 } // Reset AI text for new branch
    }

    nodes.value.push(newNode)

    if (parentEdge) {
      edges.value.push({
        id: `e${parentEdge.source}-${newNodeId}`,
        source: parentEdge.source,
        target: newNodeId
      })
    } else {
      // If it's a root node fork (unlikely but possible if we allow multiple roots), just place it near
       newNode.position = { x: originalNode.position.x + 450, y: originalNode.position.y }
    }

    setActiveNode(newNodeId)
  }

  function updateNodeUserText(nodeId: string, text: string) {
    const node = nodes.value.find(n => n.id === nodeId)
    if (!node) return

    // Check if node has children
    const hasChildren = edges.value.some(e => e.source === nodeId)

    if (hasChildren) {
      forkNode(nodeId, text)
    } else {
      node.data.userText = text
    }
  }

  function updateNodePreferredModel(nodeId: string, model: string | null) {
    const node = nodes.value.find(n => n.id === nodeId)
    if (!node) return
    node.data.preferredModel = model
  }

  function getParentNode(nodeId: string): Node | undefined {
    const edge = edges.value.find(e => e.target === nodeId)
    if (!edge) return undefined
    return nodes.value.find(n => n.id === edge.source)
  }

  function buildContext(nodeId: string) {
    const messages = []
    let currentNode: Node | undefined = nodes.value.find(n => n.id === nodeId)

    while (currentNode) {
      if (currentNode.data.aiText) {
        messages.unshift({ role: 'assistant', content: currentNode.data.aiText })
      }
      if (currentNode.data.userText) {
        messages.unshift({ role: 'user', content: currentNode.data.userText })
      }
      currentNode = getParentNode(currentNode.id)
    }
    
    // Prepend System Prompt
    if (systemPrompt.value) {
      messages.unshift({ role: 'system', content: systemPrompt.value })
    }
    
    return messages
  }

  async function generateAIResponse(nodeId: string) {
    const node = nodes.value.find(n => n.id === nodeId)
    if (!node) return

    const messages = buildContext(nodeId)
    node.data.aiText = '' // Clear previous response if any
    
    // Determine model to use: node-specific preference or global default
    const modelToUse = node.data.preferredModel || modelName.value
    node.data.model = modelToUse // Store the model used for this generation

    try {
      if (aiProvider.value === 'local') {
        // Client-side generation for Local provider using native fetch to avoid server-side SDK issues
        const baseUrl = localBaseUrl.value.replace(/\/$/, '')
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelToUse || 'local-model',
            messages: messages,
            stream: true
          })
        })

        if (!response.body) throw new Error('No response body')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed === 'data: [DONE]') continue
            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6))
                const content = data.choices?.[0]?.delta?.content || ''
                if (content) {
                  node.data.aiText += content
                  node.data.tokens = Math.ceil(node.data.aiText.length / 4)
                }
              } catch (e) {
                console.warn('Failed to parse SSE message:', trimmed)
              }
            }
          }
        }
      } else {
        // Server-side generation for Cloud providers
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            messages,
            provider: aiProvider.value,
            baseUrl: localBaseUrl.value,
            apiKey: apiKey.value,
            model: modelToUse
          })
        })

        if (!response.body) return

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          node.data.aiText += chunk
          // Estimate tokens (approx 4 chars per token)
          node.data.tokens = Math.ceil(node.data.aiText.length / 4)
        }
      }
    } catch (error) {
      console.error('Error generating AI response:', error)
      node.data.aiText = 'Error generating response.'
    }
  }

  async function syncGraph() {
    if (isSyncing.value) return
    isSyncing.value = true

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: graphId.value,
          title: graphTitle.value,
          content: {
            nodes: nodes.value,
            edges: edges.value
          }
        })
      })
      lastSyncedAt.value = new Date()
    } catch (error) {
      console.error('Failed to sync graph:', error)
    } finally {
      isSyncing.value = false
    }
  }

  async function loadGraph(id: string) {
    try {
      const response = await fetch(`/api/graph/${id}`)
      if (!response.ok) throw new Error('Failed to load graph')
      const data = await response.json()
      
      if (data && data.content) {
        // @ts-ignore
        nodes.value = data.content.nodes || []
        // @ts-ignore
        edges.value = data.content.edges || []
        graphId.value = data.id
        graphTitle.value = data.title || 'Untitled Graph'
      }
    } catch (error) {
      console.error('Failed to load graph:', error)
    }
  }

  async function fetchModels() {
    if (isFetchingModels.value) return
    isFetchingModels.value = true
    fetchError.value = null
    availableModels.value = []

    try {
      let data
      if (aiProvider.value === 'local') {
        // Fetch directly from client for local provider
        const baseUrl = localBaseUrl.value.replace(/\/$/, '')
        const response = await fetch(`${baseUrl}/models`)
        if (!response.ok) throw new Error(`Failed to fetch models: ${response.statusText}`)
        data = await response.json()
      } else {
        const response = await fetch(`/api/models?baseUrl=${encodeURIComponent(localBaseUrl.value)}&apiKey=${encodeURIComponent(apiKey.value)}`)
        if (!response.ok) throw new Error('Failed to fetch models')
        data = await response.json()
      }
      
      // Handle standard OpenAI format { data: [{ id: 'model-id', ... }] }
      if (data.data && Array.isArray(data.data)) {
        availableModels.value = data.data.map((m: any) => m.id)
      } else {
        console.warn('Unexpected model response format:', data)
        fetchError.value = 'Unexpected response format'
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
      fetchError.value = error instanceof Error ? error.message : String(error)
    } finally {
      isFetchingModels.value = false
    }
  }

  return {
    nodes,
    edges,
    activeNodeId,
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
    addNode,
    setActiveNode,
    forkNode,
    updateNodeUserText,
    updateNodePreferredModel,
    generateAIResponse,
    syncGraph,
    loadGraph,
    fetchModels
  }
})
