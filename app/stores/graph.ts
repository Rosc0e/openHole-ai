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

  // Placeholder for fork logic
  function forkNode(originalNodeId: string) {
    console.log('Forking node', originalNodeId)
  }

  return {
    nodes,
    edges,
    activeNodeId,
    addNode,
    setActiveNode,
    forkNode
  }
})
