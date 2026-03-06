import { test, expect } from '@playwright/test'
import { gotoStory } from './helpers'

test.describe('PartialRender', () => {
  test('renders content via renderer', async ({ page }) => {
    await gotoStory(page, 'primitives-partialrender--plain-text')
    await expect(page.locator('#storybook-root')).toContainText('completed plain text response')
  })

  test('shows fallback when content is empty', async ({ page }) => {
    await gotoStory(page, 'primitives-partialrender--empty')
    await expect(page.locator('#storybook-root')).toContainText('Waiting for first token')
  })

  test('error boundary catches renderer throw and shows errorFallback', async ({ page }) => {
    await gotoStory(page, 'primitives-partialrender--error-boundary-fallback')
    // The renderer always throws, so errorFallback should be shown
    await expect(page.locator('#storybook-root')).toContainText('Render failed')
    // Raw error text from the throw should NOT be shown
    await expect(page.locator('#storybook-root')).not.toContainText('Simulated parse error')
  })

  test('streaming markdown: Stream button starts token emission', async ({ page }) => {
    await gotoStory(page, 'primitives-partialrender--streaming-markdown')

    // Initial state shows fallback
    await expect(page.locator('#storybook-root')).toContainText('Press "Stream"')

    // Click stream button
    await page.getByRole('button', { name: 'Stream' }).click()
    await expect(page.getByRole('button', { name: /streaming/i })).toBeVisible()

    // Wait for completion indicator
    await expect(page.locator('#storybook-root')).toContainText('Complete', { timeout: 8000 })

    // Content should contain expected markdown output
    await expect(page.locator('#storybook-root')).toContainText('AI Response')
    await expect(page.locator('#storybook-root')).toContainText('blockquote')
  })

  test('streaming markdown: isComplete=true text shows after streaming', async ({ page }) => {
    await gotoStory(page, 'primitives-partialrender--streaming-markdown')
    await page.getByRole('button', { name: 'Stream' }).click()

    // Wait for full completion
    await expect(page.locator('#storybook-root')).toContainText('Complete', { timeout: 8000 })

    // The full markdown heading should now be rendered
    await expect(page.locator('#storybook-root h1')).toContainText('AI Response')
  })
})
