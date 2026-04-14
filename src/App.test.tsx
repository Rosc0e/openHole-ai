import { render, screen } from '@testing-library/react'
import { App } from './App'

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="react-flow-provider">{children}</div>,
}))

vi.mock('./store/GraphContext', () => ({
  GraphProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="graph-provider">{children}</div>,
}))

vi.mock('./components/graph/FlowEditor', () => ({
  FlowEditor: () => <div>Flow Editor</div>,
}))

describe('App', () => {
  it('wraps the editor with the graph and flow providers', () => {
    render(<App />)

    expect(screen.getByTestId('graph-provider')).toBeInTheDocument()
    expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument()
    expect(screen.getByText('Flow Editor')).toBeInTheDocument()
  })
})
