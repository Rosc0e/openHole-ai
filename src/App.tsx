import { ReactFlowProvider } from '@xyflow/react'
import { FlowEditor } from './components/graph/FlowEditor'
import { GraphProvider } from './store/GraphContext'

export function App() {
  return (
    <GraphProvider>
      <ReactFlowProvider>
        <FlowEditor />
      </ReactFlowProvider>
    </GraphProvider>
  )
}
