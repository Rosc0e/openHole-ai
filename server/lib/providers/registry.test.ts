describe('provider registry', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers all supported providers', async () => {
    const { providerRegistry, getProvider } = await import('./registry')

    expect(Object.keys(providerRegistry).sort()).toEqual(['anthropic', 'lmstudio', 'openai', 'openrouter'])
    expect(getProvider('lmstudio').id).toBe('lmstudio')
    expect(getProvider('anthropic').id).toBe('anthropic')
  })

  it('uses the OpenRouter OpenAI-compatible provider defaults', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 'router-model' }] }), { status: 200 }))
    const { getProvider } = await import('./registry')

    await expect(getProvider('openrouter').fetchModels({ baseUrl: '', apiKey: 'router-key' })).resolves.toEqual({
      data: [{ id: 'router-model' }],
    })

    expect(fetchMock).toHaveBeenCalledWith('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: 'Bearer router-key' },
    })
  })

  it('uses the Anthropic provider request and response shape', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'Hello from Claude' }],
        }),
        { status: 200 },
      ),
    )
    const { getProvider } = await import('./registry')

    await expect(
      getProvider('anthropic').generateText({
        apiKey: 'anthropic-key',
        model: 'claude-3-5-haiku-latest',
        messages: [
          { role: 'system', content: 'Be helpful' },
          { role: 'user', content: 'Hi' },
        ],
      }),
    ).resolves.toBe('Hello from Claude')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'anthropic-key',
          'anthropic-version': '2023-06-01',
        }),
        method: 'POST',
      }),
    )
  })
})
