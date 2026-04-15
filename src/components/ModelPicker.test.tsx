import { fireEvent, render, screen } from '@testing-library/react'
import { ModelPicker } from './ModelPicker'

describe('ModelPicker', () => {
  it('renders models as a radio list and updates the selected value', () => {
    const onValueChange = vi.fn()

    render(
      <ModelPicker
        value="model-b"
        models={['model-a', 'model-b', 'model-c']}
        onValueChange={onValueChange}
      />,
    )

    expect(screen.getByRole('radio', { name: 'model-a' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'model-b' })).toHaveAttribute('data-state', 'checked')

    fireEvent.click(screen.getByRole('radio', { name: 'model-c' }))
    expect(onValueChange).toHaveBeenCalledWith('model-c')
  })

  it('keeps the model entries in their original order after selection', () => {
    const { rerender } = render(
      <ModelPicker
        value="model-b"
        models={['model-a', 'model-b', 'model-c']}
        onValueChange={vi.fn()}
      />,
    )

    const getModelLabels = () =>
      screen
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-label'))
        .filter((label): label is string => Boolean(label))

    expect(getModelLabels()).toEqual(['model-a', 'model-b', 'model-c'])

    rerender(
      <ModelPicker
        value="model-c"
        models={['model-a', 'model-b', 'model-c']}
        onValueChange={vi.fn()}
      />,
    )

    expect(getModelLabels()).toEqual(['model-a', 'model-b', 'model-c'])
  })

  it('filters models with simple fuzzy search and keeps the list scrollable', () => {
    render(
      <ModelPicker
        value=""
        models={[
          'qwen3.5-35b-a3b-uncensored-hauhaucs-aggressive',
          'llama-3.1-8b-instruct',
          'mistral-nemo-instruct',
        ]}
        onValueChange={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Model Name'), { target: { value: 'q353' } })

    expect(screen.getByText('qwen3.5-35b-a3b-uncensored-hauhaucs-aggressive')).toBeInTheDocument()
    expect(screen.queryByText('llama-3.1-8b-instruct')).not.toBeInTheDocument()

    const list = screen.getByTestId('model-picker-options')
    expect(list).toHaveClass('max-h-60')
    expect(list).toHaveClass('overflow-y-auto')
  })

  it('supports clearing back to the empty option', () => {
    const onValueChange = vi.fn()

    render(
      <ModelPicker
        value="model-a"
        models={['model-a', 'model-b']}
        includeEmptyOption
        emptyOptionLabel="Use default model"
        onValueChange={onValueChange}
      />,
    )

    fireEvent.click(screen.getByRole('radio', { name: 'Use default model' }))
    expect(onValueChange).toHaveBeenCalledWith('')
  })
})
