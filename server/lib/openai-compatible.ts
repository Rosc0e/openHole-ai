const DEFAULT_LOCAL_OPENAI_BASE_URL = 'http://localhost:1234/v1'

export function resolveOpenAICompatibleBaseUrl(baseUrl?: string) {
  const value = baseUrl?.trim()

  if (!value) {
    return DEFAULT_LOCAL_OPENAI_BASE_URL
  }

  const url = new URL(value)
  const normalizedPath = url.pathname.replace(/\/+$/, '')

  if (!normalizedPath || normalizedPath === '/') {
    url.pathname = '/v1'
  } else if (!normalizedPath.endsWith('/v1')) {
    url.pathname = `${normalizedPath}/v1`
  } else {
    url.pathname = normalizedPath
  }

  return url.toString().replace(/\/$/, '')
}

export function createOpenAICompatibleHeaders(apiKey?: string) {
  return {
    Authorization: `Bearer ${apiKey?.trim() || 'not-needed'}`,
  }
}

export function resolveOpenAICompatibleModelsUrl(baseUrl?: string) {
  return `${resolveOpenAICompatibleBaseUrl(baseUrl)}/models`
}

export { DEFAULT_LOCAL_OPENAI_BASE_URL }
