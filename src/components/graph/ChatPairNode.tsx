import { useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useGraphStore } from '../../store/GraphContext'
import type { ChatNode } from '../../types/graph'

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

export function ChatPairNode({ id, data, selected }: NodeProps<ChatNode>) {
  const store = useGraphStore()
  const [localUserText, setLocalUserText] = useState(data.userText)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setLocalUserText(data.userText)
  }, [data.userText])

  useEffect(() => {
    if (localUserText === data.userText) {
      return
    }

    const timeout = window.setTimeout(() => {
      store.updateNodeUserText(id, localUserText)
    }, 300)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [data.userText, id, localUserText, store])

  useEffect(() => {
    if (!isSettingsOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as globalThis.Node)) {
        setIsSettingsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isSettingsOpen])

  const renderedContent = useMemo(() => {
    if (!data.aiText) {
      return ''
    }

    return DOMPurify.sanitize(markdown.render(data.aiText))
  }, [data.aiText])

  return (
    <div className={`chat-node ${selected ? 'chat-node--selected' : ''}`}>
      <Handle className="chat-node__handle chat-node__handle--target" position={Position.Left} type="target" />

      <div className="chat-node__meta">
        <span className="chat-node__status">
          <span
            className={`chat-node__status-dot ${data.preferredModel ? 'chat-node__status-dot--accent' : ''}`}
          />
          {data.model || 'Pending...'}
        </span>

        <div className="chat-node__meta-actions">
          <span className="chat-node__tokens">{data.tokens || 0} tokens</span>
          <button
            className={`icon-button icon-button--ghost ${isSettingsOpen ? 'icon-button--active' : ''}`}
            onClick={(event) => {
              event.stopPropagation()
              setIsSettingsOpen((current) => !current)
            }}
            title="Node Settings"
            type="button"
          >
            ⚙️
          </button>
        </div>

        {isSettingsOpen ? (
          <div ref={settingsRef} className="node-settings" onClick={(event) => event.stopPropagation()}>
            <div className="node-settings__title">Node Model</div>

            {store.aiProvider === 'local' && store.availableModels.length > 0 ? (
              <select
                className="field-input field-input--compact"
                value={data.preferredModel || ''}
                onChange={(event) =>
                  store.updateNodePreferredModel(id, event.target.value || null)
                }
              >
                <option value="">Use Global Default</option>
                {store.availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="field-input field-input--compact"
                type="text"
                placeholder="Global Default"
                value={data.preferredModel || ''}
                onChange={(event) =>
                  store.updateNodePreferredModel(id, event.target.value || null)
                }
              />
            )}

            <div className="node-settings__hint">
              {data.preferredModel ? (
                <div>
                  Using: <span className="node-settings__value">{data.preferredModel}</span>
                </div>
              ) : (
                <div>
                  Using Global: <span className="node-settings__value">{store.modelName || 'Default'}</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="chat-node__section chat-node__section--user">
        <div className="chat-node__label">User</div>
        <textarea
          className="chat-node__textarea"
          data-testid={`node-textarea-${id}`}
          placeholder="Type your message..."
          rows={2}
          value={localUserText}
          onChange={(event) => setLocalUserText(event.target.value)}
        />
      </div>

      <div className="chat-node__section chat-node__section--assistant">
        <div className="chat-node__label chat-node__label--assistant">Assistant</div>

        {data.aiText ? (
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        ) : (
          <div className="chat-node__empty-state">
            <span className="chat-node__empty-dot" />
            Waiting for input...
          </div>
        )}
      </div>

      <Handle className="chat-node__handle chat-node__handle--source" position={Position.Right} type="source" />
    </div>
  )
}
