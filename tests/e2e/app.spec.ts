import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })
})

test('exercises core editor interactions', async ({ page }) => {
  await page.route('**/api/sync', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.route('**/v1/models', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 'local-model' }, { id: 'second-model' }] }),
    })
  })

  await page.route('**/v1/chat/completions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"choices":[{"delta":{"content":"Hello from test"}}]}\n\ndata: [DONE]\n\n',
    })
  })

  await page.goto('/')

  await expect(page.locator('.react-flow__node')).toHaveCount(1)

  await page.click('[data-testid="open-settings-button"]')
  await page.click('[data-testid="refresh-models-button"]')
  await expect(page.locator('#modelName')).toContainText('local-model')
  await page.click('text=Done')

  await page.click('.react-flow__node')
  await page.fill('[data-testid="global-input-textarea"]', 'Playwright prompt')
  await page.click('[data-testid="send-button"]')
  await expect(page.locator('.markdown-content')).toContainText('Hello from test')

  await page.click('[data-testid="sync-graph-button"]')

  await page.locator('.react-flow__pane').dispatchEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 300,
    clientY: 250,
  })
  await expect(page.locator('[data-testid="create-node-button"]')).toBeVisible()
  await page.locator('[data-testid="create-node-button"]').evaluate((element: HTMLButtonElement) => element.click())
  await expect(page.locator('.react-flow__node')).toHaveCount(2)
})

test('loads a remote graph by id from the query string', async ({ page }) => {
  await page.route('**/api/graph/graph-42', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'graph-42',
        title: 'Remote Graph',
        content: {
          nodes: [
            {
              id: 'remote-node',
              type: 'chatPair',
              position: { x: 80, y: 40 },
              data: {
                userText: 'Loaded from API',
                aiText: 'Remote answer',
              },
            },
          ],
          edges: [],
        },
      }),
    })
  })

  await page.route('**/api/sync', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.goto('/?id=graph-42')

  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  await page.click('.react-flow__node')
  await expect(page.locator('[data-testid="global-input-textarea"]')).toHaveValue('Loaded from API')
  await expect(page.locator('.markdown-content')).toContainText('Remote answer')
})
