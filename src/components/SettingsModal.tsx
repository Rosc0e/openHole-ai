import { useGraphStore } from '../store/GraphContext'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const store = useGraphStore()

  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" data-testid="settings-modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <h2 className="modal-title">Global Settings</h2>

        <div className="form-stack">
          <div className="field-group">
            <label className="field-label" htmlFor="systemPrompt">
              System Prompt
            </label>
            <textarea
              id="systemPrompt"
              className="field-textarea"
              rows={4}
              value={store.systemPrompt}
              onChange={(event) => store.setSystemPrompt(event.target.value)}
            />
          </div>

          <div className="field-group">
            <span className="field-label">AI Provider</span>
            <div className="radio-row">
              <label className="radio-label">
                <input
                  type="radio"
                  name="aiProvider"
                  value="openai"
                  checked={store.aiProvider === 'openai'}
                  onChange={() => store.setAiProvider('openai')}
                />
                <span>OpenAI (Cloud)</span>
              </label>

              <label className="radio-label">
                <input
                  type="radio"
                  name="aiProvider"
                  value="local"
                  checked={store.aiProvider === 'local'}
                  onChange={() => store.setAiProvider('local')}
                />
                <span>LM Studio (Local)</span>
              </label>
            </div>
          </div>

          {store.aiProvider === 'local' ? (
            <div className="field-group">
              <label className="field-label" htmlFor="localBaseUrl">
                Local Base URL
              </label>
              <input
                id="localBaseUrl"
                className="field-input"
                type="text"
                placeholder="http://localhost:1234/v1"
                value={store.localBaseUrl}
                onChange={(event) => store.setLocalBaseUrl(event.target.value)}
              />
            </div>
          ) : null}

          <div className="field-group">
            <label className="field-label" htmlFor="apiKey">
              API Key {store.aiProvider === 'local' ? '(Optional)' : ''}
            </label>
            <input
              id="apiKey"
              className="field-input"
              type="password"
              placeholder="sk-..."
              value={store.apiKey}
              onChange={(event) => store.setApiKey(event.target.value)}
            />
          </div>

          <div className="field-group">
            <div className="field-label-row">
              <label className="field-label" htmlFor="modelName">
                Model Name
              </label>
              {store.aiProvider === 'local' ? (
                <button
                  className="secondary-link"
                  data-testid="refresh-models-button"
                  disabled={store.isFetchingModels}
                  onClick={() => void store.fetchModels()}
                  type="button"
                >
                  {store.isFetchingModels ? '↻ Loading...' : '↻ Refresh Models'}
                </button>
              ) : null}
            </div>

            {store.fetchError ? <div className="field-error">{store.fetchError}</div> : null}

            {store.aiProvider === 'local' && store.availableModels.length > 0 ? (
              <select
                id="modelName"
                className="field-input"
                value={store.modelName}
                onChange={(event) => store.setModelName(event.target.value)}
              >
                {store.availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="modelName"
                className="field-input"
                type="text"
                placeholder="gpt-4o or local-model"
                value={store.modelName}
                onChange={(event) => store.setModelName(event.target.value)}
              />
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="primary-button" onClick={onClose} type="button">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
