import { test, expect } from '@playwright/test'
import { gotoStory } from './helpers'

const STORY_ID = 'integrations-vercel-ai-sdk--default'

test.describe('Vercel AI SDK useChat integration', () => {
  test('shows idle state initially', async ({ page }) => {
    await gotoStory(page, STORY_ID)

    const root = page.locator('#storybook-root')
    await expect(root).toContainText('Send message')
    await expect(root).toContainText('idle')
  })

  test('simulates streaming lifecycle: submitted → streaming → complete', async ({ page }) => {
    await gotoStory(page, STORY_ID)

    const root = page.locator('#storybook-root')
    const container = root.locator('[data-status]')

    // Initial state
    await expect(container).toHaveAttribute('data-status', 'idle')

    // Trigger simulation
    await page.getByRole('button', { name: 'Send message' }).click()

    // Moves through streaming
    await expect(container).toHaveAttribute('data-status', 'streaming', { timeout: 2000 })

    // Eventually reaches complete
    await expect(container).toHaveAttribute('data-status', 'complete', { timeout: 8000 })
  })

  test('StreamingText shows accumulated tokens after completion', async ({ page }) => {
    await gotoStory(page, STORY_ID)

    const root = page.locator('#storybook-root')
    const container = root.locator('[data-status]')

    await page.getByRole('button', { name: 'Send message' }).click()

    // Wait for completion
    await expect(container).toHaveAttribute('data-status', 'complete', { timeout: 8000 })

    // The full streamed text should be visible
    await expect(root).toContainText('Vercel AI SDK')
    await expect(root).toContainText('useChat')
  })
})
