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

  function addNode(node: Node) {
    nodes.value.push(node)
  }

  function setActiveNode(id: string | null) {
    activeNodeId.value = id
  }

  function forkNode(originalNodeId: string, newText: string) {
    const originalNode = nodes.value.find(n => n.id === originalNodeId)
    if (!originalNode) return

    const newNodeId = crypto.randomUUID()
    const newNode: Node = {
      id: newNodeId,
      type: 'chatPair',
      position: { x: originalNode.position.x + 50, y: originalNode.position.y + 50 }, // Simple offset for now
      data: { ...originalNode.data, userText: newText, aiText: '' } // Reset AI text for new branch
    }

    nodes.value.push(newNode)

    // Find parent edge
    const parentEdge = edges.value.find(e => e.target === originalNodeId)
    if (parentEdge) {
      edges.value.push({
        id: `e${parentEdge.source}-${newNodeId}`,
        source: parentEdge.source,
        target: newNodeId
      })
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
        body: JSON.stringify({ messages })
      })

      if (!response.body) return

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        node.data.aiText += chunk
      }
    } catch (error) {
      console.error('Error generating AI response:', error)
      node.data.aiText = 'Error generating response.'
    }
  }

  return {
    nodes,
    edges,
    activeNodeId,
    addNode,
    setActiveNode,
    forkNode,
    updateNodeUserText,
    generateAIResponse
  }
})
