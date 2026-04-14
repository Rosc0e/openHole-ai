import { fireEvent, render, screen } from '@testing-library/react'
import { ChatPairNode } from './ChatPairNode'
import type { ChatNode } from '../../types/graph'

const store = {
  aiProvider: 'local' as const,
  availableModels: ['model-a'],
  modelName: 'global-model',
  updateNodeUserText: vi.fn(),
  updateNodePreferredModel: vi.fn(),
}

vi.mock('../../store/GraphContext', () => ({
  useGraphStore: () => store,
}))

vi.mock('@xyflow/react', () => ({
  Handle: (props: Record<string, unknown>) => <div data-testid="handle" {...props} />,
  Position: { Left: 'left', Right: 'right' },
}))

describe('ChatPairNode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function renderNode(overrides: Partial<ChatNode['data']> = {}) {
    return render(
      <ChatPairNode
        id="node-1"
        data={{
          userText: 'Hello',
          aiText: '```js\nconsole.log(1)\n```',
          tokens: 5,
          model: 'model-a',
          preferredModel: null,
          ...overrides,
        }}
        selected={true}
        dragging={false}
        zIndex={1}
        selectable={true}
        deletable={true}
        draggable={true}
        isConnectable={true}
        sourcePosition="right"
        targetPosition="left"
        xPos={0}
        yPos={0}
      />,
    )
  }

  it('renders markdown and debounces user updates', () => {
    renderNode()

    expect(screen.getByText('5 tokens')).toBeInTheDocument()
    expect(document.querySelector('.markdown-content pre')).not.toBeNull()

    fireEvent.change(screen.getByTestId('node-textarea-node-1'), { target: { value: 'Updated text' } })
    vi.advanceTimersByTime(300)

    expect(store.updateNodeUserText).toHaveBeenCalledWith('node-1', 'Updated text')
  })

  it('supports node-level model settings and outside click closing', () => {
    renderNode({ aiText: '', preferredModel: 'model-a' })

    fireEvent.click(screen.getByTitle('Node Settings'))
    expect(screen.getByText('Using:')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Node Model'))
    expect(screen.getByText('Node Model')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('model-a'), { target: { value: '' } })
    expect(store.updateNodePreferredModel).toHaveBeenCalledWith('node-1', null)

    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Node Model')).not.toBeInTheDocument()
  })

  it('renders the empty assistant state and text input fallback', () => {
    store.availableModels = []
    renderNode({ aiText: '', preferredModel: 'custom-model' })

    fireEvent.click(screen.getByTitle('Node Settings'))
    fireEvent.change(screen.getByDisplayValue('custom-model'), { target: { value: 'custom-next' } })

    expect(store.updateNodePreferredModel).toHaveBeenCalledWith('node-1', 'custom-next')
    expect(screen.getByText('Waiting for input...')).toBeInTheDocument()
  })
})
