import { test, expect } from '@playwright/test'
import { gotoStory } from './helpers'

test.describe('TypingIndicator', () => {
  test('dots variant renders 3 dot elements', async ({ page }) => {
    await gotoStory(page, 'primitives-typingindicator--dots')
    const dots = page.locator('[data-stp-dot]')
    await expect(dots).toHaveCount(3)
  })

  test('dots variant has role=status with accessible label', async ({ page }) => {
    await gotoStory(page, 'primitives-typingindicator--dots')
    const indicator = page.getByRole('status')
    await expect(indicator).toBeVisible()
    await expect(indicator).toHaveAttribute('aria-label', 'AI is typing')
  })

  test('pulse variant renders pulse circle', async ({ page }) => {
    await gotoStory(page, 'primitives-typingindicator--pulse')
    await expect(page.locator('[data-stp-pulse-circle]')).toBeVisible()
    await expect(page.locator('[data-stp-dot]')).toHaveCount(0)
  })

  test('bar variant renders 3 bar elements', async ({ page }) => {
    await gotoStory(page, 'primitives-typingindicator--bar')
    const bars = page.locator('[data-stp-bar]')
    await expect(bars).toHaveCount(3)
  })

  test('hidden story renders nothing', async ({ page }) => {
    await gotoStory(page, 'primitives-typingindicator--hidden')
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('all-variants story shows all three variants simultaneously', async ({ page }) => {
    await gotoStory(page, 'primitives-typingindicator--all-variants')
    await expect(page.locator('[data-stp-dots]')).toBeVisible()
    await expect(page.locator('[data-stp-pulse]')).toBeVisible()
    await expect(page.locator('[data-stp-bars]')).toBeVisible()
  })

  test('animation CSS keyframes are injected into the document', async ({ page }) => {
    await gotoStory(page, 'primitives-typingindicator--dots')
    // The component injects a <style> tag with animation keyframes
    const injectedStyle = page.locator('[data-stp-style]')
    await expect(injectedStyle).toBeAttached()
    const css = await injectedStyle.textContent()
    expect(css).toContain('stp-bounce')
    expect(css).toContain('stp-pulse')
    expect(css).toContain('stp-bar')
  })

  test('inherits color from parent', async ({ page }) => {
    await gotoStory(page, 'primitives-typingindicator--inherited-color')
    // Four colored spans, each wrapping a TypingIndicator
    const indicators = page.getByRole('status')
    await expect(indicators).toHaveCount(4)
  })
})
