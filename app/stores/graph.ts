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
  const aiProvider = useStorage<'openai' | 'local'>('rabbit-ai-provider', 'openai')
  const localBaseUrl = useStorage('rabbit-local-base-url', 'http://localhost:1234/v1')

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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages,
          provider: aiProvider.value,
          baseUrl: localBaseUrl.value
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
    addNode,
    setActiveNode,
    forkNode,
    updateNodeUserText,
    generateAIResponse,
    syncGraph,
    loadGraph
  }
})
