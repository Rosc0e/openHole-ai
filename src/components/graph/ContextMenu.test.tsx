import { fireEvent, render, screen } from '@testing-library/react'
import { ContextMenu } from './ContextMenu'

describe('ContextMenu', () => {
  it('creates a node and closes when clicking outside or pressing escape', () => {
    const onClose = vi.fn()
    const onCreateNode = vi.fn()

    render(<ContextMenu x={10} y={20} onClose={onClose} onCreateNode={onCreateNode} />)

    fireEvent.click(screen.getByTestId('create-node-button'))
    expect(onCreateNode).toHaveBeenCalled()

    fireEvent.mouseDown(document.body)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('does not close when clicking inside the menu', () => {
    const onClose = vi.fn()

    render(<ContextMenu x={10} y={20} onClose={onClose} onCreateNode={vi.fn()} />)

    fireEvent.mouseDown(screen.getByTestId('flow-context-menu'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
