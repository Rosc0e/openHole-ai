import type { ChatEdge, ChatMessage, ChatNode } from '../types/graph'

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4)
}

export function getParentNode(nodes: ChatNode[], edges: ChatEdge[], nodeId: string) {
  const parentEdge = edges.find((edge) => edge.target === nodeId)

  if (!parentEdge) {
    return undefined
  }

  return nodes.find((node) => node.id === parentEdge.source)
}

export function buildContextMessages(
  nodes: ChatNode[],
  edges: ChatEdge[],
  nodeId: string,
  systemPrompt: string,
): ChatMessage[] {
  const messages: ChatMessage[] = []
  let currentNode = nodes.find((node) => node.id === nodeId)

  while (currentNode) {
    if (currentNode.data.aiText) {
      messages.unshift({ role: 'assistant', content: currentNode.data.aiText })
    }

    if (currentNode.data.userText) {
      messages.unshift({ role: 'user', content: currentNode.data.userText })
    }

    currentNode = getParentNode(nodes, edges, currentNode.id)
  }

  if (systemPrompt) {
    messages.unshift({ role: 'system', content: systemPrompt })
  }

  return messages
}

export function forkNodeState(
  nodes: ChatNode[],
  edges: ChatEdge[],
  originalNodeId: string,
  newText: string,
  createId: () => string,
) {
  const originalNode = nodes.find((node) => node.id === originalNodeId)

  if (!originalNode) {
    return null
  }

  const parentEdge = edges.find((edge) => edge.target === originalNodeId)
  const siblingCount = parentEdge ? edges.filter((edge) => edge.source === parentEdge.source).length : 0
  const newNodeId = createId()
  const newNode: ChatNode = {
    id: newNodeId,
    type: 'chatPair',
    position: {
      x: originalNode.position.x + 450,
      y: originalNode.position.y + siblingCount * 100,
    },
    data: {
      ...originalNode.data,
      userText: newText,
      aiText: '',
      tokens: 0,
    },
  }

  const nextEdges = parentEdge
    ? [
        ...edges,
        {
          id: `e${parentEdge.source}-${newNodeId}`,
          source: parentEdge.source,
          target: newNodeId,
          type: 'smoothstep',
        },
      ]
    : edges

  return {
    nodes: [...nodes, newNode],
    edges: nextEdges,
    activeNodeId: newNodeId,
  }
}

export function updateNodeUserTextState(
  nodes: ChatNode[],
  edges: ChatEdge[],
  nodeId: string,
  text: string,
  createId: () => string,
) {
  const hasChildren = edges.some((edge) => edge.source === nodeId)

  if (hasChildren) {
    return forkNodeState(nodes, edges, nodeId, text, createId)
  }

  return {
    nodes: nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              userText: text,
            },
          }
        : node,
    ),
    edges,
    activeNodeId: null,
  }
}
