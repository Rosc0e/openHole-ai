import { createEmptyChatNode, createInitialNode } from './graph'

describe('graph types', () => {
  it('creates the seeded initial node', () => {
    expect(createInitialNode()).toEqual({
      id: '1',
      type: 'chatPair',
      position: { x: 250, y: 5 },
      data: {
        userText: 'Hello world',
        aiText: 'Hi there! How can I help you today?',
      },
    })
  })

  it('creates empty nodes at the requested position', () => {
    expect(createEmptyChatNode('node-2', { x: 10, y: 20 })).toEqual({
      id: 'node-2',
      type: 'chatPair',
      position: { x: 10, y: 20 },
      data: {
        userText: '',
        aiText: '',
      },
    })
  })
})
