import type { Edge, Node, XYPosition } from '@xyflow/react'

export type AIProvider = 'openai' | 'local'
export type MessageRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: MessageRole
  content: string
}

export interface ChatPairData {
  [key: string]: unknown
  userText: string
  aiText: string
  model?: string
  tokens?: number
  preferredModel?: string | null
}

export type ChatNode = Node<ChatPairData, 'chatPair'>
export type ChatEdge = Edge

export interface GraphContent {
  nodes: ChatNode[]
  edges: ChatEdge[]
}

export interface StoredGraph {
  id: string
  title: string | null
  content: GraphContent | null
}

export function createInitialNode(
  id = '1',
  position: XYPosition = { x: 250, y: 5 },
): ChatNode {
  return {
    id,
    type: 'chatPair',
    position,
    data: {
      userText: 'Hello world',
      aiText: 'Hi there! How can I help you today?',
    },
  }
}

export function createEmptyChatNode(id: string, position: XYPosition): ChatNode {
  return {
    id,
    type: 'chatPair',
    position,
    data: {
      userText: '',
      aiText: '',
    },
  }
}
