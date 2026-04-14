import { ModelPicker } from './ModelPicker'
import { useGraphStore } from '../store/GraphContext'
import type { AIProvider } from '../types/graph'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'

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
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-3xl gap-0 overflow-y-auto p-0" showCloseButton={false}>
        <DialogHeader className="border-b px-6 pt-6 pb-5">
          <DialogTitle>Global Settings</DialogTitle>
          <DialogDescription>
            Configure provider routing, default model selection, and the system prompt that shapes every branch.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Defaults</CardTitle>
              <CardDescription>
                Set the instruction scaffold and choose where requests should be routed by default.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="systemPrompt">System Prompt</FieldLabel>
                  <Textarea
                    id="systemPrompt"
                    className="min-h-28"
                    rows={5}
                    value={store.systemPrompt}
                    onChange={(event) => store.setSystemPrompt(event.target.value)}
                  />
                </Field>

                <FieldSet>
                  <FieldLegend variant="label">AI Provider</FieldLegend>
                  <FieldDescription>
                    OpenAI stays cloud-hosted. LM Studio is proxied through the server so local models work in-browser.
                  </FieldDescription>
                  <RadioGroup
                    className="gap-3"
                    value={store.aiProvider}
                    onValueChange={(value) => store.setAiProvider(value as AIProvider)}
                  >
                    <FieldLabel htmlFor="provider-openai">
                      <Field orientation="horizontal" className="rounded-lg border border-border bg-background px-3 py-3">
                        <FieldContent>
                          <span className="text-sm font-medium text-foreground">OpenAI (Cloud)</span>
                          <FieldDescription>Use your OpenAI-compatible cloud key from the server route.</FieldDescription>
                        </FieldContent>
                        <RadioGroupItem id="provider-openai" value="openai" />
                      </Field>
                    </FieldLabel>

                    <FieldLabel htmlFor="provider-local">
                      <Field orientation="horizontal" className="rounded-lg border border-border bg-background px-3 py-3">
                        <FieldContent>
                          <span className="text-sm font-medium text-foreground">LM Studio (Local)</span>
                          <FieldDescription>Fetches `/v1/models` and sends generation requests through the Nitro server.</FieldDescription>
                        </FieldContent>
                        <RadioGroupItem id="provider-local" value="local" />
                      </Field>
                    </FieldLabel>
                  </RadioGroup>
                </FieldSet>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Provider Connection</CardTitle>
              <CardDescription>
                Keep credentials and model selection together so the active provider is clear at a glance.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <FieldGroup>
                {store.aiProvider === 'local' ? (
                  <Field>
                    <FieldLabel htmlFor="localBaseUrl">Local Base URL</FieldLabel>
                    <Input
                      id="localBaseUrl"
                      placeholder="http://localhost:1234/v1"
                      value={store.localBaseUrl}
                      onChange={(event) => store.setLocalBaseUrl(event.target.value)}
                    />
                    <FieldDescription>
                      If you enter the LM Studio host without `/v1`, the server will normalize it automatically.
                    </FieldDescription>
                  </Field>
                ) : null}

                <Field>
                  <FieldLabel htmlFor="apiKey">API Key {store.aiProvider === 'local' ? '(Optional)' : ''}</FieldLabel>
                  <Input
                    id="apiKey"
                    placeholder="sk-..."
                    type="password"
                    value={store.apiKey}
                    onChange={(event) => store.setApiKey(event.target.value)}
                  />
                </Field>

                <Field>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <FieldContent>
                      <FieldLabel htmlFor="modelName">Model Name</FieldLabel>
                      <FieldDescription>
                        {store.aiProvider === 'local'
                          ? 'Choose from LM Studio model ids or type a fallback when the list is unavailable.'
                          : 'Set the model name that should be used for new generations.'}
                      </FieldDescription>
                    </FieldContent>

                    {store.aiProvider === 'local' ? (
                      <Button
                        data-testid="refresh-models-button"
                        disabled={store.isFetchingModels}
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => void store.fetchModels()}
                      >
                        {store.isFetchingModels ? 'Loading models…' : 'Refresh Models'}
                      </Button>
                    ) : null}
                  </div>

                  {store.fetchError ? (
                    <Alert className="mt-3" variant="destructive">
                      <AlertTitle>Model lookup failed</AlertTitle>
                      <AlertDescription>{store.fetchError}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="mt-3">
                    {store.aiProvider === 'local' && store.availableModels.length > 0 ? (
                      <ModelPicker
                        id="modelName"
                        emptyMessage="No matching LM Studio models."
                        models={store.availableModels}
                        placeholder="Search local models…"
                        value={store.modelName}
                        onValueChange={store.setModelName}
                      />
                    ) : (
                      <Input
                        id="modelName"
                        placeholder="gpt-4o or local-model"
                        value={store.modelName}
                        onChange={(event) => store.setModelName(event.target.value)}
                      />
                    )}
                  </div>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="px-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
