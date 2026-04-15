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
import { PanelLeftCloseIcon, PanelLeftOpenIcon, PlusIcon, RefreshCwIcon, SendHorizontalIcon, Settings2Icon, Trash2Icon } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { SettingsModal } from '../SettingsModal'
import { useGraphStore } from '../../store/GraphContext'
import { createEmptyChatNode, type ChatEdge, type ChatNode } from '../../types/graph'
import { ChatPairNode } from './ChatPairNode'
import { ContextMenu } from './ContextMenu'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const GRID_SIZE = 20
const NODE_OFFSET_X = 225
const NODE_OFFSET_Y = 50

export function FlowEditor() {
  const store = useGraphStore()
  const reactFlow = useReactFlow<ChatNode, ChatEdge>()
  const connectingNodeId = useRef<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSidebarHoverExpanded, setIsSidebarHoverExpanded] = useState(false)
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
    store.resetGraph()
  }, [store])

  const isSidebarVisuallyCollapsed = isSidebarCollapsed && !isSidebarHoverExpanded

  const onToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((current) => !current)
    setIsSidebarHoverExpanded(false)
  }, [])

  const onSidebarMouseEnter = useCallback(() => {
    if (isSidebarCollapsed) {
      setIsSidebarHoverExpanded(true)
    }
  }, [isSidebarCollapsed])

  const onSidebarMouseLeave = useCallback(() => {
    setIsSidebarHoverExpanded(false)
  }, [])

  return (
    <div className="app-shell">
      <aside
        className={cn('sidebar', isSidebarVisuallyCollapsed && 'sidebar--collapsed')}
        data-testid="session-sidebar"
        onMouseEnter={onSidebarMouseEnter}
        onMouseLeave={onSidebarMouseLeave}
      >
        <div className="sidebar__header">
          <div className="sidebar__header-main">
            <div className="sidebar__brand">RN</div>

            {isSidebarVisuallyCollapsed ? null : (
              <div className="sidebar__identity">
                <div className="sidebar__title">RabbitNode</div>
                <div className="sidebar__subtitle">Flow editor</div>
              </div>
            )}
          </div>

          <Button
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="sidebar__icon-button sidebar__toggle"
            onClick={onToggleSidebar}
            size="icon"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
            variant="ghost"
          >
            {isSidebarCollapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
            <span className="sr-only">{isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
          </Button>
        </div>

        <div className="sidebar__actions">
          <Button
            aria-label="New Graph"
            className="sidebar__icon-button"
            onClick={onCreateNewGraph}
            size="icon"
            title="New Graph"
            type="button"
            variant="ghost"
          >
            <PlusIcon />
            <span className="sr-only">New Graph</span>
          </Button>

          <Button
            aria-label="Sync graph"
            className={cn('sidebar__icon-button', store.isSyncing && 'sidebar__icon-button--active')}
            data-testid="sync-graph-button"
            onClick={() => void store.syncGraph()}
            title={store.isSyncing ? 'Syncing...' : 'Sync Now'}
            size="icon"
            type="button"
            variant="ghost"
          >
            <RefreshCwIcon className={cn(store.isSyncing && 'animate-spin')} />
            <span className="sr-only">Sync graph</span>
          </Button>
        </div>

        {isSidebarVisuallyCollapsed ? null : (
          <div className="sidebar__sessions">
            <div className="sidebar__section-title">Sessions</div>

            <div className="sidebar__session-list">
              {store.sessions.map((session) => {
                const isActive = session.id === store.graphId

                return (
                  <button
                    key={session.id}
                    className={cn('sidebar__session-button', isActive && 'sidebar__session-button--active')}
                    type="button"
                    onClick={() => void store.loadGraph(session.id)}
                  >
                    <div className="sidebar__session-row">
                      <span className="sidebar__session-title">{session.title || 'Untitled Graph'}</span>
                      <Button
                        aria-label={`Delete ${session.title || 'Untitled Graph'}`}
                        className="sidebar__session-delete"
                        data-testid={`delete-session-${session.id}`}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation()
                          void store.deleteGraph(session.id)
                        }}
                      >
                        <Trash2Icon />
                        <span className="sr-only">Delete session</span>
                      </Button>
                    </div>
                    <span className="sidebar__session-meta">{new Date(session.updatedAt).toLocaleString()}</span>
                  </button>
                )
              })}
            </div>

            {store.sessionsHasMore ? (
              <Button className="sidebar__more" onClick={() => void store.loadMoreSessions()} type="button" variant="ghost">
                {store.isLoadingSessions ? 'Loading…' : 'Load more sessions'}
              </Button>
            ) : null}
          </div>
        )}

        <div className="sidebar__footer">
          <Button
            aria-label="Settings"
            className="sidebar__icon-button"
            data-testid="open-settings-button"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
            size="icon"
            type="button"
            variant="ghost"
          >
            <Settings2Icon />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
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
          <Card className="global-input__card">
            <CardContent className="global-input__inner">
              <div className="global-input__field">
                {store.activeNode ? (
                  <Textarea
                    className="global-input__textarea min-h-20 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
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

              <Button
                className="primary-button--send"
                data-testid="send-button"
                disabled={!store.activeNodeId}
                onClick={onGenerate}
                type="button"
                variant="default"
              >
                <SendHorizontalIcon data-icon="inline-start" />
                Send
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
