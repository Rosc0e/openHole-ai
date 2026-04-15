import { useMemo, useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

const EMPTY_MODEL_VALUE = '__openhole_empty_model__'

interface ModelPickerProps {
  id?: string
  value: string
  models: string[]
  onValueChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  includeEmptyOption?: boolean
  emptyOptionLabel?: string
  disabled?: boolean
}

export function ModelPicker({
  id,
  value,
  models,
  onValueChange,
  placeholder = 'Search models…',
  emptyMessage = 'No models found.',
  includeEmptyOption = false,
  emptyOptionLabel = 'Use default model',
  disabled = false,
}: ModelPickerProps) {
  const [query, setQuery] = useState('')

  const options = useMemo(() => {
    const seen = new Set<string>()
    const next: string[] = []

    for (const model of models) {
      if (seen.has(model)) {
        continue
      }

      seen.add(model)
      next.push(model)
    }

    return next
  }, [models, value])

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return options
    }

    return options.filter((model) => matchesSimpleFuzzy(model, normalizedQuery))
  }, [options, query])

  const selectedValue = value.trim() || EMPTY_MODEL_VALUE

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="px-2 pt-2 pb-1">
          <InputGroup className="border-input/30 bg-input/30 shadow-none">
            <Input
              id={id}
              aria-label="Model Name"
              className="border-0 bg-transparent font-mono text-xs shadow-none focus-visible:border-0 focus-visible:ring-0 sm:text-sm"
              disabled={disabled}
              placeholder={placeholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon className="size-4 shrink-0 opacity-50" />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="border-t border-border/70 px-1 py-1">
          <RadioGroup
            aria-label="Available models"
            className="max-h-60 gap-1 overflow-y-auto pr-1"
            data-testid="model-picker-options"
            disabled={disabled}
            value={selectedValue}
            onValueChange={(nextValue) => {
              onValueChange(nextValue === EMPTY_MODEL_VALUE ? '' : nextValue)
            }}
          >
            {includeEmptyOption ? (
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/60',
                  !value.trim() && 'bg-muted/50',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <RadioGroupItem value={EMPTY_MODEL_VALUE} />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{emptyOptionLabel}</div>
                </div>
              </label>
            ) : null}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((model) => (
                <label
                  key={model}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/60',
                    model === value.trim() && 'bg-muted/50',
                    disabled && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <RadioGroupItem aria-label={model} value={model} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs sm:text-sm">{model}</div>
                  </div>
                </label>
              ))
            ) : (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <SearchIcon className="size-4" />
                <span>{emptyMessage}</span>
              </div>
            )}
          </RadioGroup>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        Current selection: <span className="font-mono">{value || emptyOptionLabel}</span>
      </div>
    </div>
  )
}

function matchesSimpleFuzzy(candidate: string, query: string) {
  const normalizedCandidate = candidate.toLowerCase()

  if (normalizedCandidate.includes(query)) {
    return true
  }

  let queryIndex = 0

  for (const character of normalizedCandidate) {
    if (character === query[queryIndex]) {
      queryIndex += 1
    }

    if (queryIndex >= query.length) {
      return true
    }
  }

  return false
}
