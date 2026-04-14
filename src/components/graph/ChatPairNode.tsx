import { useEffect, useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Settings2Icon } from 'lucide-react'
import { ModelPicker } from '../ModelPicker'
import { useGraphStore } from '../../store/GraphContext'
import type { ChatNode } from '../../types/graph'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

export function ChatPairNode({ id, data, selected }: NodeProps<ChatNode>) {
  const store = useGraphStore()
  const [localUserText, setLocalUserText] = useState(data.userText)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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
        <div className="chat-node__status-wrap">
          <span className="chat-node__status">
            <span
              className={`chat-node__status-dot ${data.preferredModel ? 'chat-node__status-dot--accent' : ''}`}
            />
            {data.model || 'Pending...'}
          </span>
          <Badge className="chat-node__badge" variant="outline">
            {data.preferredModel ? 'Node model' : 'Global model'}
          </Badge>
        </div>

        <div className="chat-node__meta-actions">
          <Badge className="chat-node__tokens" variant="outline">
            {data.tokens || 0} tokens
          </Badge>
          <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <PopoverTrigger asChild>
              <Button
                aria-pressed={isSettingsOpen}
                className="chat-node__settings-trigger"
                size="icon-sm"
                title="Node Settings"
                type="button"
                variant="ghost"
                onClick={(event) => event.stopPropagation()}
              >
                <Settings2Icon />
                <span className="sr-only">Node Settings</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80" onClick={(event) => event.stopPropagation()}>
              <PopoverHeader>
                <PopoverTitle>Node Model</PopoverTitle>
                <PopoverDescription>
                  Override the global model for this node without affecting the rest of the graph.
                </PopoverDescription>
              </PopoverHeader>

              <FieldGroup>
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor={`node-model-${id}`}>Node Model</FieldLabel>
                    <FieldDescription>
                      {data.preferredModel
                        ? `Using ${data.preferredModel}`
                        : `Using global default ${store.modelName || 'Default'}`}
                    </FieldDescription>
                  </FieldContent>

                  {store.aiProvider === 'local' && store.availableModels.length > 0 ? (
                    <ModelPicker
                      id={`node-model-${id}`}
                      emptyMessage="No matching node models."
                      emptyOptionLabel="Use global default"
                      includeEmptyOption
                      models={store.availableModels}
                      placeholder="Search node models…"
                      value={data.preferredModel || ''}
                      onValueChange={(value) => store.updateNodePreferredModel(id, value || null)}
                    />
                  ) : (
                    <Input
                      id={`node-model-${id}`}
                      placeholder="Global Default"
                      value={data.preferredModel || ''}
                      onChange={(event) => store.updateNodePreferredModel(id, event.target.value || null)}
                    />
                  )}
                </Field>
              </FieldGroup>
            </PopoverContent>
          </Popover>
        </div>
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
