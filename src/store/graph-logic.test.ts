import { buildContextMessages, estimateTokens, forkNodeState, getParentNode, updateNodeUserTextState } from './graph-logic'
import { createEmptyChatNode, createInitialNode, type ChatEdge, type ChatNode } from '../types/graph'

describe('graph logic', () => {
  const root = createInitialNode('root', { x: 0, y: 0 })
  const child = {
    ...createEmptyChatNode('child', { x: 450, y: 0 }),
    data: {
      userText: 'Second question',
      aiText: 'Second answer',
    },
  } satisfies ChatNode
  const edges: ChatEdge[] = [{ id: 'e-root-child', source: 'root', target: 'child', type: 'smoothstep' }]

  it('estimates tokens by simple character chunking', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('12345')).toBe(2)
  })

  it('finds a parent node through edges', () => {
    expect(getParentNode([root, child], edges, 'child')).toEqual(root)
    expect(getParentNode([root, child], edges, 'root')).toBeUndefined()
  })

  it('builds ordered context with system prompt', () => {
    expect(buildContextMessages([root, child], edges, 'child', 'System')).toEqual([
      { role: 'system', content: 'System' },
      { role: 'user', content: 'Hello world' },
      { role: 'assistant', content: 'Hi there! How can I help you today?' },
      { role: 'user', content: 'Second question' },
      { role: 'assistant', content: 'Second answer' },
    ])
  })

  it('omits empty message fields and empty system prompts', () => {
    expect(
      buildContextMessages(
        [
          {
            ...createEmptyChatNode('solo', { x: 0, y: 0 }),
            data: { userText: '', aiText: '' },
          },
        ],
        [],
        'solo',
        '',
      ),
    ).toEqual([])
  })

  it('forks a node when editing a node that already has children', () => {
    const result = forkNodeState([root, child], edges, 'root', 'Branched prompt', () => 'branch-1')

    expect(result).toEqual({
      nodes: [
        root,
        child,
        {
          id: 'branch-1',
          type: 'chatPair',
          position: { x: 450, y: 0 },
          data: {
            userText: 'Branched prompt',
            aiText: '',
            tokens: 0,
          },
        },
      ],
      edges,
      activeNodeId: 'branch-1',
    })
  })

  it('returns null when the fork target is missing', () => {
    expect(forkNodeState([root], [], 'missing', 'Text', () => 'id')).toBeNull()
  })

  it('updates in place when a node has no children', () => {
    const result = updateNodeUserTextState([root], [], 'root', 'Updated', () => 'unused')

    expect(result).toEqual({
      nodes: [
        {
          ...root,
          data: {
            ...root.data,
            userText: 'Updated',
          },
        },
      ],
      edges: [],
      activeNodeId: null,
    })
  })

  it('delegates to forking when a node has children', () => {
    const result = updateNodeUserTextState([root, child], [{ id: 'edge', source: 'root', target: 'child' }], 'root', 'Fork me', () => 'forked')

    expect(result?.activeNodeId).toBe('forked')
    expect(result?.nodes).toHaveLength(3)
  })

  it('creates a sibling edge when the edited node has a parent', () => {
    const grandChild = createEmptyChatNode('grand-child', { x: 900, y: 0 })
    const result = forkNodeState([root, child, grandChild], [...edges, { id: 'edge-child-grand', source: 'child', target: 'grand-child' }], 'child', 'Branch child', () => 'branch-child')

    expect(result?.edges.at(-1)).toEqual({
      id: 'eroot-branch-child',
      source: 'root',
      target: 'branch-child',
      type: 'smoothstep',
    })
  })
})
