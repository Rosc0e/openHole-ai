import { act, fireEvent, render, screen } from '@testing-library/react'
import { FlowEditor } from './FlowEditor'
import { createInitialNode } from '../../types/graph'

let reactFlowProps: Record<string, any> = {}
const screenToFlowPosition = vi.fn(({ x, y }) => ({ x, y }))

const store = {
  nodes: [createInitialNode()],
  edges: [],
  activeNodeId: '1',
  activeNode: createInitialNode(),
  graphId: 'g1',
  isSyncing: false,
  sessions: [{ id: 'g1', title: 'Current session', updatedAt: '2026-04-14T03:00:00.000Z' }],
  sessionsHasMore: true,
  isLoadingSessions: false,
  setNodes: vi.fn(),
  setEdges: vi.fn(),
  setActiveNode: vi.fn(),
  addNode: vi.fn(),
  updateNodeUserText: vi.fn(),
  generateAIResponse: vi.fn(async () => {}),
  resetGraph: vi.fn(),
  syncGraph: vi.fn(async () => {}),
  loadGraph: vi.fn(async () => {}),
  loadMoreSessions: vi.fn(async () => {}),
  deleteGraph: vi.fn(async () => {}),
}

vi.mock('../../store/GraphContext', () => ({
  useGraphStore: () => store,
}))

vi.mock('@xyflow/react', () => ({
  addEdge: (connection: Record<string, unknown>, edges: unknown[]) => [...edges, { ...connection, id: 'edge-added' }],
  applyEdgeChanges: (_changes: unknown[], edges: unknown[]) => edges,
  applyNodeChanges: (_changes: unknown[], nodes: unknown[]) => nodes,
  Background: () => <div>Background</div>,
  Controls: () => <div>Controls</div>,
  PanOnScrollMode: { Free: 'free' },
  ReactFlow: (props: Record<string, any>) => {
    reactFlowProps = props
    return <div data-testid="react-flow-mock">{props.children}</div>
  },
  useReactFlow: () => ({ screenToFlowPosition }),
}))

vi.mock('../SettingsModal', () => ({
  SettingsModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div>
        <div>Settings Modal</div>
        <button data-testid="close-settings-button" onClick={onClose} type="button">
          Close Settings
        </button>
      </div>
    ) : null,
}))

vi.mock('./ContextMenu', () => ({
  ContextMenu: ({ onCreateNode, onClose }: { onCreateNode: () => void; onClose: () => void }) => (
    <div>
      <button data-testid="mock-context-menu" onClick={onCreateNode} type="button">
        Create New Node
      </button>
      <button data-testid="mock-context-close" onClick={onClose} type="button">
        Close Menu
      </button>
    </div>
  ),
}))

vi.mock('./ChatPairNode', () => ({
  ChatPairNode: () => <div>Chat Pair Node</div>,
}))

describe('FlowEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reactFlowProps = {}
    store.nodes = [createInitialNode()]
    store.activeNodeId = '1'
    store.activeNode = createInitialNode()
    store.graphId = 'g1'
    store.isSyncing = false
    store.sessions = [{ id: 'g1', title: 'Current session', updatedAt: '2026-04-14T03:00:00.000Z' }]
    store.sessionsHasMore = true
    store.isLoadingSessions = false
  })

  it('renders editor controls and delegates button actions', () => {
    render(<FlowEditor />)

    fireEvent.click(screen.getByTitle('New Graph'))
    fireEvent.click(screen.getByTestId('sync-graph-button'))
    fireEvent.click(screen.getByTestId('open-settings-button'))
    expect(screen.getByText('Settings Modal')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('close-settings-button'))
    fireEvent.change(screen.getByTestId('global-input-textarea'), { target: { value: 'Hello flow' } })
    fireEvent.click(screen.getByTestId('send-button'))

    expect(store.resetGraph).toHaveBeenCalled()
    expect(store.syncGraph).toHaveBeenCalled()
    expect(store.updateNodeUserText).toHaveBeenCalledWith('1', 'Hello flow')
    expect(store.generateAIResponse).toHaveBeenCalledWith('1')
  })

  it('renders session history, switches sessions, and loads more history', () => {
    store.sessions = [
      { id: 'g1', title: 'Current session', updatedAt: '2026-04-14T03:00:00.000Z' },
      { id: 'g2', title: 'Older session', updatedAt: '2026-04-14T02:00:00.000Z' },
    ]

    render(<FlowEditor />)

    fireEvent.click(screen.getByText('Older session').closest('button') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: 'Load more sessions' }))

    expect(store.loadGraph).toHaveBeenCalledWith('g2')
    expect(store.loadMoreSessions).toHaveBeenCalled()
    expect(screen.getByText('Current session')).toBeInTheDocument()
  })

  it('deletes a session from the sidebar without opening it', () => {
    store.sessions = [
      { id: 'g1', title: 'Current session', updatedAt: '2026-04-14T03:00:00.000Z' },
      { id: 'g2', title: 'Older session', updatedAt: '2026-04-14T02:00:00.000Z' },
    ]

    render(<FlowEditor />)

    fireEvent.click(screen.getByTestId('delete-session-g2'))

    expect(store.deleteGraph).toHaveBeenCalledWith('g2')
    expect(store.loadGraph).not.toHaveBeenCalledWith('g2')
  })

  it('creates a new graph immediately without a browser confirmation modal', () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    render(<FlowEditor />)

    fireEvent.click(screen.getByTitle('New Graph'))

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(store.resetGraph).toHaveBeenCalledTimes(1)
  })

  it('temporarily expands the collapsed sidebar on hover and keeps manual expand control', () => {
    render(<FlowEditor />)

    const sidebar = screen.getByTestId('session-sidebar')
    expect(sidebar).not.toHaveClass('sidebar--collapsed')
    expect(screen.getByText('Sessions')).toBeInTheDocument()
    expect(screen.getByText('Current session')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

    expect(sidebar).toHaveClass('sidebar--collapsed')
    expect(screen.queryByText('Sessions')).not.toBeInTheDocument()
    expect(screen.queryByText('Current session')).not.toBeInTheDocument()

    fireEvent.mouseEnter(sidebar)

    expect(sidebar).not.toHaveClass('sidebar--collapsed')
    expect(screen.getByText('Sessions')).toBeInTheDocument()
    expect(screen.getByText('Current session')).toBeInTheDocument()

    fireEvent.mouseLeave(sidebar)

    expect(sidebar).toHaveClass('sidebar--collapsed')
    expect(screen.queryByText('Sessions')).not.toBeInTheDocument()

    fireEvent.mouseEnter(sidebar)
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    fireEvent.mouseLeave(sidebar)

    expect(sidebar).not.toHaveClass('sidebar--collapsed')
    expect(screen.getByText('Sessions')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
  })

  it('uses React Flow callbacks for edges, nodes, selection, and context menus', () => {
    render(<FlowEditor />)

    act(() => {
      reactFlowProps.onNodesChange([{ id: '1', type: 'position' }])
      reactFlowProps.onEdgesChange([{ id: '1', type: 'remove' }])
      reactFlowProps.onConnect({ source: '1', target: '2' })
      reactFlowProps.onNodeClick(null, { id: '1' })
      reactFlowProps.onPaneContextMenu({ preventDefault: vi.fn(), clientX: 300, clientY: 400 })
    })

    fireEvent.click(screen.getByTestId('mock-context-menu'))

    expect(store.setNodes).toHaveBeenCalledWith(expect.any(Function))
    expect(store.setEdges).toHaveBeenCalled()
    expect(store.setActiveNode).toHaveBeenCalledWith('1')
    expect(store.addNode).toHaveBeenCalled()
    expect(screenToFlowPosition).toHaveBeenCalledWith({ x: 300, y: 400 })
  })

  it('creates a node when a connection ends on the pane and hides the input when nothing is active', () => {
    store.activeNodeId = null
    store.activeNode = null

    render(<FlowEditor />)

    act(() => {
      reactFlowProps.onConnectStart(null, { nodeId: '1' })
      reactFlowProps.onConnectEnd({
        clientX: 100,
        clientY: 200,
        target: { classList: { contains: (name: string) => name === 'react-flow__pane' } },
      })
      reactFlowProps.onPaneClick()
    })

    expect(store.addNode).toHaveBeenCalled()
    expect(store.setEdges).toHaveBeenCalled()
    expect(screen.getByText('Select a node to start typing...')).toBeInTheDocument()
  })

  it('returns early when a connection ends without a source node', () => {
    render(<FlowEditor />)

    act(() => {
      reactFlowProps.onConnectEnd({
        clientX: 50,
        clientY: 80,
        target: { classList: { contains: () => true } },
      })
    })

    expect(store.addNode).not.toHaveBeenCalled()
  })

  it('closes the context menu through its close callback', () => {
    render(<FlowEditor />)

    act(() => {
      reactFlowProps.onPaneContextMenu({ preventDefault: vi.fn(), clientX: 10, clientY: 10 })
    })

    fireEvent.click(screen.getByTestId('mock-context-close'))
    expect(screen.queryByTestId('mock-context-menu')).not.toBeInTheDocument()
  })

  it('skips generate and input updates when no active node id exists', () => {
    store.activeNodeId = null
    store.activeNode = createInitialNode()
    store.isSyncing = true

    render(<FlowEditor />)

    fireEvent.change(screen.getByTestId('global-input-textarea'), { target: { value: 'Ignored' } })
    fireEvent.keyDown(screen.getByTestId('global-input-textarea'), { key: 'Enter', ctrlKey: true })

    expect(store.updateNodeUserText).not.toHaveBeenCalled()
    expect(store.generateAIResponse).not.toHaveBeenCalled()
    expect(screen.getByTitle('Syncing...')).toBeInTheDocument()
  })
})
