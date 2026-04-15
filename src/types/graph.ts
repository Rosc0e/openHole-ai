import type { Edge, Node, XYPosition } from '@xyflow/react'

export type AIProvider = 'openai' | 'openrouter' | 'anthropic' | 'lmstudio'

export const AI_PROVIDER_OPTIONS: Array<{ value: AIProvider; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'lmstudio', label: 'LM Studio' },
]

export function getDefaultModelForProvider(provider: AIProvider) {
  if (provider === 'anthropic') {
    return 'claude-3-5-haiku-latest'
  }

  if (provider === 'lmstudio') {
    return 'local-model'
  }

  return 'gpt-4o'
}

export function getDefaultBaseUrlForProvider(provider: AIProvider) {
  if (provider === 'lmstudio') {
    return 'http://localhost:1234/v1'
  }

  return ''
}
export type MessageRole = 'system' | 'user' | 'assistant'
export type GenerationStatus = 'idle' | 'running' | 'complete' | 'error'

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
  generationStatus?: GenerationStatus
  generationError?: string | null
  generationRunId?: string | null
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
  updatedAt?: string | Date | null
}

export interface SessionListItem {
  id: string
  title: string | null
  updatedAt: string
}

export interface SessionListResponse {
  items: SessionListItem[]
  nextCursor: string | null
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
