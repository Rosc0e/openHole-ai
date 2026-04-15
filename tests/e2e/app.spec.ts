import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })
})

test('exercises core editor interactions', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('.react-flow__node')).toHaveCount(1)

  await page.click('[data-testid="open-settings-button"]')
  await expect(page.getByLabel('Model Name')).toBeVisible()
  await page.click('text=Done')

  await page.click('.react-flow__node')
  await page.fill('[data-testid="global-input-textarea"]', 'Playwright prompt')
  await expect(page.locator('[data-testid="global-input-textarea"]')).toHaveValue('Playwright prompt')

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
