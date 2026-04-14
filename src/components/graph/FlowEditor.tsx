import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  PanOnScrollMode,
  ReactFlow,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnConnectEnd,
  type OnConnectStart,
} from '@xyflow/react'
import { useCallback, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { SettingsModal } from '../SettingsModal'
import { useGraphStore } from '../../store/GraphContext'
import { createEmptyChatNode, type ChatEdge, type ChatNode } from '../../types/graph'
import { ChatPairNode } from './ChatPairNode'
import { ContextMenu } from './ContextMenu'

const GRID_SIZE = 20
const NODE_OFFSET_X = 225
const NODE_OFFSET_Y = 50

export function FlowEditor() {
  const store = useGraphStore()
  const reactFlow = useReactFlow<ChatNode, ChatEdge>()
  const connectingNodeId = useRef<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    flowX: 0,
    flowY: 0,
  })

  const nodeTypes = useMemo(
    () => ({
      chatPair: ChatPairNode,
    }),
    [],
  )

  const onNodesChange = useCallback(
    (changes: NodeChange<ChatNode>[]) => {
      store.setNodes((currentNodes) => applyNodeChanges(changes, currentNodes))
    },
    [store],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange<ChatEdge>[]) => {
      store.setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges))
    },
    [store],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      store.setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
          },
          currentEdges,
        ),
      )
    },
    [store],
  )

  const onConnectStart = useCallback<OnConnectStart>((_, params) => {
    connectingNodeId.current = params.nodeId ?? null
  }, [])

  const onConnectEnd = useCallback<OnConnectEnd>(
    (event) => {
      const sourceNodeId = connectingNodeId.current

      if (!sourceNodeId) {
        return
      }

      const target = event.target as HTMLElement | null
      const targetIsPane = target?.classList.contains('react-flow__pane')

      if (targetIsPane && 'clientX' in event && 'clientY' in event) {
        const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
        const newNodeId = `node-${Date.now()}`

        store.addNode(
          createEmptyChatNode(newNodeId, {
            x: position.x - NODE_OFFSET_X,
            y: position.y - NODE_OFFSET_Y,
          }),
        )

        store.setEdges((currentEdges) => [
          ...currentEdges,
          {
            id: `e${sourceNodeId}-${newNodeId}`,
            source: sourceNodeId,
            target: newNodeId,
            type: 'smoothstep',
          },
        ])
      }

      connectingNodeId.current = null
    },
    [reactFlow, store],
  )

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | ReactMouseEvent<Element>) => {
      event.preventDefault()

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        flowX: position.x,
        flowY: position.y,
      })
    },
    [reactFlow],
  )

  const onCreateNodeFromMenu = useCallback(() => {
    store.addNode(
      createEmptyChatNode(`node-${Date.now()}`, {
        x: contextMenu.flowX - NODE_OFFSET_X,
        y: contextMenu.flowY - NODE_OFFSET_Y,
      }),
    )

    setContextMenu((current) => ({ ...current, visible: false }))
  }, [contextMenu.flowX, contextMenu.flowY, store])

  const onGlobalInput = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!store.activeNodeId) {
        return
      }

      store.updateNodeUserText(store.activeNodeId, event.target.value)
    },
    [store],
  )

  const onGenerate = useCallback(() => {
    if (!store.activeNodeId) {
      return
    }

    void store.generateAIResponse(store.activeNodeId)
  }, [store])

  const onCreateNewGraph = useCallback(() => {
    if (window.confirm('Are you sure? This will clear the current graph.')) {
      store.resetGraph()
    }
  }, [store])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">RN</div>

        <button className="icon-button" onClick={onCreateNewGraph} title="New Graph" type="button">
          +
        </button>

        <button
          className="icon-button icon-button--with-indicator"
          data-testid="sync-graph-button"
          onClick={() => void store.syncGraph()}
          title={store.isSyncing ? 'Syncing...' : 'Sync Now'}
          type="button"
        >
          ☁️
          {store.isSyncing ? <span className="status-indicator" /> : null}
        </button>

        <div className="sidebar__spacer" />

        <button
          className="icon-button"
          data-testid="open-settings-button"
          onClick={() => setIsSettingsOpen(true)}
          title="Settings"
          type="button"
        >
          ⚙️
        </button>
      </aside>

      <main className="canvas-area">
        <ReactFlow<ChatNode, ChatEdge>
          className="rabbit-flow"
          data-testid="flow-editor"
          defaultEdgeOptions={{ type: 'smoothstep' }}
          edges={store.edges}
          nodeTypes={nodeTypes}
          nodes={store.nodes}
          panOnDrag={false}
          panOnScroll
          panOnScrollMode={PanOnScrollMode.Free}
          snapGrid={[GRID_SIZE, GRID_SIZE]}
          snapToGrid
          zoomOnDoubleClick={false}
          zoomOnScroll={false}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          onConnectStart={onConnectStart}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => store.setActiveNode(node.id)}
          onNodesChange={onNodesChange}
          onPaneClick={() => setContextMenu((current) => ({ ...current, visible: false }))}
          onPaneContextMenu={onPaneContextMenu}
        >
          <Background color="var(--color-grid)" gap={GRID_SIZE} />
          <Controls />
        </ReactFlow>

        {contextMenu.visible ? (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu((current) => ({ ...current, visible: false }))}
            onCreateNode={onCreateNodeFromMenu}
          />
        ) : null}

        <div className={`global-input ${store.activeNodeId ? '' : 'global-input--hidden'}`}>
          <div className="global-input__inner">
            <div className="global-input__field">
              {store.activeNode ? (
                <textarea
                  className="global-input__textarea"
                  data-testid="global-input-textarea"
                  placeholder="Type your message here..."
                  rows={2}
                  value={store.activeNode.data.userText}
                  onChange={onGlobalInput}
                  onKeyDown={(event) => {
                    if (event.ctrlKey && event.key === 'Enter') {
                      event.preventDefault()
                      onGenerate()
                    }
                  }}
                />
              ) : (
                <div className="global-input__placeholder">Select a node to start typing...</div>
              )}
            </div>

            <button
              className="primary-button primary-button--send"
              data-testid="send-button"
              disabled={!store.activeNodeId}
              onClick={onGenerate}
              type="button"
            >
              Send
            </button>
          </div>
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
