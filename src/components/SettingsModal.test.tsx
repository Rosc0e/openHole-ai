import { fireEvent, render, screen } from '@testing-library/react'
import { SettingsModal } from './SettingsModal'

const store = {
  systemPrompt: 'System',
  aiProvider: 'local' as const,
  localBaseUrl: 'http://localhost:1234/v1',
  apiKey: '',
  modelName: 'local-model',
  availableModels: ['local-model', 'second-model'],
  isFetchingModels: false,
  fetchError: null as string | null,
  setSystemPrompt: vi.fn(),
  setAiProvider: vi.fn(),
  setLocalBaseUrl: vi.fn(),
  setApiKey: vi.fn(),
  setModelName: vi.fn(),
  fetchModels: vi.fn(async () => {}),
}

vi.mock('../store/GraphContext', () => ({
  useGraphStore: () => store,
}))

vi.mock('./ModelPicker', () => ({
  ModelPicker: ({ id, value, onValueChange }: { id?: string; value: string; onValueChange: (value: string) => void }) => (
    <input id={id} data-testid="mock-model-picker" value={value} onChange={(event) => onValueChange(event.target.value)} />
  ),
}))

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.aiProvider = 'local'
    store.availableModels = ['local-model', 'second-model']
    store.fetchError = null
    store.isFetchingModels = false
  })

  it('does not render when closed', () => {
    render(<SettingsModal isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Global Settings')).not.toBeInTheDocument()
  })

  it('updates settings and closes from backdrop and button', async () => {
    const onClose = vi.fn()
    render(<SettingsModal isOpen onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('System Prompt'), { target: { value: 'Updated system' } })
    expect(store.setSystemPrompt).toHaveBeenCalledWith('Updated system')

    fireEvent.click(screen.getByText('OpenAI (Cloud)'))
    expect(store.setAiProvider).toHaveBeenCalledWith('openai')

    fireEvent.change(screen.getByLabelText(/API Key/), { target: { value: 'secret' } })
    expect(store.setApiKey).toHaveBeenCalledWith('secret')

    fireEvent.change(screen.getByLabelText('Model Name'), { target: { value: 'second-model' } })
    expect(store.setModelName).toHaveBeenCalledWith('second-model')

    fireEvent.click(screen.getByTestId('refresh-models-button'))
    expect(store.fetchModels).toHaveBeenCalled()

    fireEvent.click(screen.getByText('Done'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the text input version when no local models exist and shows errors', () => {
    store.availableModels = []
    store.fetchError = 'Failed to fetch'

    render(<SettingsModal isOpen onClose={vi.fn()} />)

    expect(screen.getByText('Failed to fetch')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('gpt-4o or local-model')).toBeInTheDocument()
  })

  it('hides local-only controls for cloud mode and updates the fallback model input', () => {
    store.aiProvider = 'openai'
    store.availableModels = []

    render(<SettingsModal isOpen onClose={vi.fn()} />)

    expect(screen.queryByLabelText('Local Base URL')).not.toBeInTheDocument()
    expect(screen.queryByTestId('refresh-models-button')).not.toBeInTheDocument()
    expect(screen.getByLabelText('API Key')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('gpt-4o or local-model'), { target: { value: 'gpt-5' } })
    expect(store.setModelName).toHaveBeenCalledWith('gpt-5')
  })

  it('updates the local base url field', () => {
    render(<SettingsModal isOpen onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('LM Studio (Local)'))
    fireEvent.change(screen.getByLabelText('Local Base URL'), { target: { value: 'http://localhost:5555/v1' } })
    expect(store.setLocalBaseUrl).toHaveBeenCalledWith('http://localhost:5555/v1')
  })
})
