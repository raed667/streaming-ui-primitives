import { test, expect } from '@playwright/test'
import { gotoStory } from './helpers'

test.describe('useTokenStream hook (via story)', () => {
  test('default: idle until Start is clicked', async ({ page }) => {
    await gotoStory(page, 'hooks-usetokenstream--default')
    // Before clicking, shows idle text
    await expect(page.locator('#storybook-root')).toContainText('Press Start')
    // Status badge shows idle
    await expect(page.locator('#storybook-root')).toContainText('idle')
  })

  test('default: streams text after Start click', async ({ page }) => {
    await gotoStory(page, 'hooks-usetokenstream--default')

    await page.getByRole('button', { name: 'Start' }).click()

    // Status transitions to streaming
    await expect(page.locator('#storybook-root')).toContainText('streaming', { timeout: 2000 })

    // Wait for complete
    await expect(page.locator('#storybook-root')).toContainText('complete', { timeout: 10000 })

    // Full text rendered
    await expect(page.locator('#storybook-root')).toContainText('quick brown fox')
  })

  test('default: Reset clears text and returns to idle', async ({ page }) => {
    await gotoStory(page, 'hooks-usetokenstream--default')

    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page.locator('#storybook-root')).toContainText('complete', { timeout: 10000 })

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.locator('#storybook-root')).toContainText('idle')
    await expect(page.locator('#storybook-root')).toContainText('Press Start')
  })

  test('default: cursor visible during streaming, hidden after complete', async ({ page }) => {
    await gotoStory(page, 'hooks-usetokenstream--default')

    await page.getByRole('button', { name: 'Start' }).click()

    // Cursor should appear during streaming
    await expect(page.locator('[data-streaming-cursor]')).toBeVisible({ timeout: 3000 })

    // After complete, cursor gone
    await expect(page.locator('#storybook-root')).toContainText('complete', { timeout: 10000 })
    await expect(page.locator('[data-streaming-cursor]')).toHaveCount(0)
  })

  test('fast stream: completes quickly', async ({ page }) => {
    await gotoStory(page, 'hooks-usetokenstream--fast-stream')

    await page.getByRole('button', { name: 'Start' }).click()
    // Fast stream (20ms/token) should complete well within 5s
    await expect(page.locator('#storybook-root')).toContainText('complete', { timeout: 5000 })
    await expect(page.locator('#storybook-root')).toContainText('quick brown fox')
  })

  test('error handling: status transitions to error', async ({ page }) => {
    await gotoStory(page, 'hooks-usetokenstream--error-handling')

    await page.getByRole('button', { name: 'Start' }).click()

    // Some partial text arrives first
    await expect(page.locator('#storybook-root')).toContainText('Starting…', { timeout: 3000 })

    // Then the error is caught and displayed
    await expect(page.locator('#storybook-root')).toContainText('Connection dropped', {
      timeout: 5000,
    })
    await expect(page.locator('#storybook-root')).toContainText('Error caught')
  })

  test('typing indicator shows before first token arrives', async ({ page }) => {
    await gotoStory(page, 'hooks-usetokenstream--slow-stream')

    await page.getByRole('button', { name: 'Start' }).click()

    // During the gap before first token, TypingIndicator should be visible
    // (the story shows it when text is empty but status is streaming)
    await expect(page.getByRole('status')).toBeVisible({ timeout: 2000 })

    // Once tokens arrive the indicator disappears (text no longer empty)
    await expect(page.locator('#storybook-root')).toContainText('quick', { timeout: 5000 })
  })
})
