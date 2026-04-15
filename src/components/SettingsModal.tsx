import { ModelPicker } from './ModelPicker'
import { useGraphStore } from '../store/GraphContext'
import { AI_PROVIDER_OPTIONS, getDefaultModelForProvider, type AIProvider } from '../types/graph'
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

  const apiKeyLabel = store.aiProvider === 'lmstudio' ? 'API Key (Optional)' : 'API Key'
  const modelPlaceholder = store.aiProvider === 'anthropic'
    ? getDefaultModelForProvider('anthropic')
    : 'gpt-4o or local-model'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent
        className="flex h-[85vh] w-[85vw] max-h-[85vh] max-w-[85vw] flex-col gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-6 pt-6 pb-5">
          <DialogTitle>Global Settings</DialogTitle>
          <DialogDescription>
            Configure provider routing, default model selection, and the system prompt that shapes every branch.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-4">
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
                      Pick the provider the server should use for model lookups and generation requests.
                    </FieldDescription>
                    <RadioGroup
                      className="gap-3"
                      value={store.aiProvider}
                      onValueChange={(value) => store.setAiProvider(value as AIProvider)}
                    >
                      {AI_PROVIDER_OPTIONS.map((provider) => (
                        <FieldLabel key={provider.value} htmlFor={`provider-${provider.value}`}>
                          <Field orientation="horizontal" className="rounded-lg border border-border bg-background px-3 py-3">
                            <FieldContent>
                              <span className="text-sm font-medium text-foreground">{provider.label}</span>
                              <FieldDescription>{describeProvider(provider.value)}</FieldDescription>
                            </FieldContent>
                            <RadioGroupItem id={`provider-${provider.value}`} value={provider.value} />
                          </Field>
                        </FieldLabel>
                      ))}
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
                  <Field>
                    <FieldLabel htmlFor="apiKey">{apiKeyLabel}</FieldLabel>
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
                          {store.availableModels.length > 0
                            ? 'Choose from the provider model ids or type a fallback when the list is unavailable.'
                            : 'Set the model name that should be used for new generations.'}
                        </FieldDescription>
                      </FieldContent>

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
                    </div>

                    {store.fetchError ? (
                      <Alert className="mt-3" variant="destructive">
                        <AlertTitle>Model lookup failed</AlertTitle>
                        <AlertDescription>{store.fetchError}</AlertDescription>
                      </Alert>
                    ) : null}

                    <div className="mt-3">
                      {store.availableModels.length > 0 ? (
                        <ModelPicker
                          id="modelName"
                          emptyMessage="No matching provider models."
                          models={store.availableModels}
                          placeholder="Search provider models…"
                          value={store.modelName}
                          onValueChange={store.setModelName}
                        />
                      ) : (
                        <Input
                          id="modelName"
                          placeholder={modelPlaceholder}
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

function describeProvider(provider: AIProvider) {
  if (provider === 'openrouter') {
    return 'OpenAI-compatible routing with OpenRouter defaults and optional attribution headers.'
  }

  if (provider === 'anthropic') {
    return 'Uses Anthropic-compatible requests for model lookups and message generation.'
  }

  if (provider === 'lmstudio') {
    return 'Fetches local `/v1/models` data and proxies local generation through the server.'
  }

  return 'Uses OpenAI-compatible requests with the hosted OpenAI defaults.'
}
