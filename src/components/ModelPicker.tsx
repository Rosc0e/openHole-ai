import { useMemo, useState } from 'react'
import { CheckIcon } from 'lucide-react'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
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
    const normalizedValue = value.trim()
    const seen = new Set<string>()
    const next: string[] = []

    if (normalizedValue) {
      seen.add(normalizedValue)
      next.push(normalizedValue)
    }

    for (const model of models) {
      if (seen.has(model)) {
        continue
      }

      seen.add(model)
      next.push(model)
    }

    return next
  }, [models, value])

  return (
    <div className="flex flex-col gap-3">
      <Command className="rounded-lg border border-border bg-background">
        <CommandInput
          id={id}
          aria-label="Model Name"
          className="font-mono text-xs sm:text-sm"
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-60">
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          {includeEmptyOption ? (
            <CommandItem
              key={EMPTY_MODEL_VALUE}
              value={EMPTY_MODEL_VALUE}
              onSelect={() => {
                onValueChange('')
                setQuery('')
              }}
            >
              <span className="truncate">{emptyOptionLabel}</span>
              <CheckIcon className={cn('ml-auto', !value && 'opacity-100')} />
            </CommandItem>
          ) : null}
          {options.map((model) => {
            const isSelected = model === value.trim()

            return (
              <CommandItem
                key={model}
                value={model}
                onSelect={() => {
                  onValueChange(model)
                  setQuery('')
                }}
              >
                <span className="truncate font-mono text-xs sm:text-sm">{model}</span>
                <CheckIcon className={cn('ml-auto', isSelected ? 'opacity-100' : 'opacity-0')} />
              </CommandItem>
            )
          })}
        </CommandList>
      </Command>
      <div className="text-xs text-muted-foreground">
        Current selection: <span className="font-mono">{value || emptyOptionLabel}</span>
      </div>
    </div>
  )
}
