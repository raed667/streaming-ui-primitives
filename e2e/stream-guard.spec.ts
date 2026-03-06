import { test, expect } from '@playwright/test'
import { gotoStory } from './helpers'

test.describe('StreamGuard', () => {
  test('idle story shows idle slot only', async ({ page }) => {
    await gotoStory(page, 'primitives-streamguard--idle')
    await expect(page.locator('#storybook-root')).toContainText('Ask me anything')
    // streaming slot (TypingIndicator) must not be present
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('streaming story shows streaming slot only', async ({ page }) => {
    await gotoStory(page, 'primitives-streamguard--streaming')
    await expect(page.getByRole('status')).toBeVisible()
    await expect(page.locator('#storybook-root')).not.toContainText('Ask me anything')
  })

  test('complete story shows complete slot only', async ({ page }) => {
    await gotoStory(page, 'primitives-streamguard--complete')
    await expect(page.locator('#storybook-root')).toContainText('The answer is 42')
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('error story shows error slot with error message', async ({ page }) => {
    await gotoStory(page, 'primitives-streamguard--error-state')
    await expect(page.locator('#storybook-root')).toContainText('Connection timed out')
  })

  test('lifecycle simulation: clicking status buttons switches slots', async ({ page }) => {
    await gotoStory(page, 'primitives-streamguard--lifecycle-simulation')

    const root = page.locator('#storybook-root')

    // Default state is idle
    await expect(root).toContainText('Start a conversation')

    // Click streaming
    await page.getByRole('button', { name: 'streaming' }).click()
    await expect(page.getByRole('status')).toBeVisible()

    // Click complete
    await page.getByRole('button', { name: 'complete' }).click()
    await expect(page.getByRole('status')).toHaveCount(0)

    // Click error
    await page.getByRole('button', { name: 'error' }).click()
    await expect(root).toContainText('Error:')

    // Click idle to reset
    await page.getByRole('button', { name: 'idle' }).click()
    await expect(root).toContainText('Start a conversation')
  })

  test('lifecycle simulation: run simulation transitions through all states', async ({ page }) => {
    await gotoStory(page, 'primitives-streamguard--lifecycle-simulation')

    await page.getByRole('button', { name: 'Run simulation' }).click()

    // streaming state — TypingIndicator appears
    await expect(page.getByRole('status')).toBeVisible({ timeout: 2000 })

    // complete state — text content appears
    await expect(page.locator('#storybook-root')).toContainText('simulation is complete', {
      timeout: 5000,
    })
    // TypingIndicator gone
    await expect(page.getByRole('status')).toHaveCount(0)
  })
})
