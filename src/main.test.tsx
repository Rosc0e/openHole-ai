describe('main entrypoint', () => {
  afterEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
  })

  it('throws when the root element is missing', async () => {
    await expect(import('./main')).rejects.toThrow('Root element not found')
  })

  it('mounts the app when the root element exists', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    const render = vi.fn()
    const createRoot = vi.fn(() => ({ render }))

    vi.doMock('react-dom/client', () => ({
      default: { createRoot },
      createRoot,
    }))

    vi.doMock('./App', () => ({
      App: () => <div>Mounted App</div>,
    }))

    await import('./main')

    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'))
    expect(render).toHaveBeenCalled()
  })
})
