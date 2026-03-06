import { test, expect } from '@playwright/test'
import { gotoStory } from './helpers'

test.describe('StreamingText', () => {
  test('renders static content without cursor', async ({ page }) => {
    await gotoStory(page, 'primitives-streamingtext--static')
    const root = page.locator('#storybook-root')
    await expect(root).toContainText('Hello, world!')
    // No cursor when cursor=false
    await expect(page.locator('[data-streaming-cursor]')).toHaveCount(0)
  })

  test('shows cursor when cursor=true and isStreaming=true', async ({ page }) => {
    await gotoStory(page, 'primitives-streamingtext--with-cursor')
    await expect(page.locator('[data-streaming-cursor]')).toBeVisible()
    await expect(page.locator('[data-streaming-cursor]')).toHaveAttribute('aria-hidden', 'true')
  })

  test('cursor is hidden when isStreaming=false', async ({ page }) => {
    await gotoStory(page, 'primitives-streamingtext--cursor-hidden-when-done')
    await expect(page.locator('[data-streaming-cursor]')).toHaveCount(0)
  })

  test('cursor blink CSS keyframe is injected', async ({ page }) => {
    await gotoStory(page, 'primitives-streamingtext--with-cursor')
    const styleTag = page.locator('[data-streaming-cursor-style]')
    await expect(styleTag).toBeAttached()
    const css = await styleTag.textContent()
    expect(css).toContain('streaming-cursor-blink')
  })

  test('custom cursor node is rendered', async ({ page }) => {
    await gotoStory(page, 'primitives-streamingtext--custom-cursor')
    // The custom cursor is the ▌ character
    await expect(page.locator('#storybook-root')).toContainText('▌')
  })

  test('renders as h2 when as=h2', async ({ page }) => {
    await gotoStory(page, 'primitives-streamingtext--as-heading')
    await expect(page.locator('h2')).toBeVisible()
    await expect(page.locator('h2')).toContainText('Streaming heading text')
  })

  test('live streaming story: replay button triggers text accumulation', async ({ page }) => {
    await gotoStory(page, 'primitives-streamingtext--live-streaming')

    const container = page.locator('[data-streaming]')

    // Initially not streaming
    await expect(container).toHaveAttribute('data-streaming', 'false')

    // Click replay to start stream
    await page.getByRole('button', { name: /replay/i }).click()

    // During streaming the attribute becomes true
    await expect(container).toHaveAttribute('data-streaming', 'true')

    // Wait for streaming to complete
    await expect(container).toHaveAttribute('data-streaming', 'false', { timeout: 10000 })

    // Text should now contain expected content
    await expect(page.locator('#storybook-root')).toContainText('quick brown fox')

    // Cursor should be gone after completion
    await expect(page.locator('[data-streaming-cursor]')).toHaveCount(0)
  })
})
