import { Page } from '@playwright/test'

/**
 * Navigate to a Storybook story iframe.
 * The story ID is the kebab-cased version of "Title/StoryName".
 * e.g. "Primitives/TypingIndicator" + "Dots" → "primitives-typingindicator--dots"
 */
export async function gotoStory(page: Page, storyId: string) {
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
  // Storybook 8 sets hidden on #storybook-root while loading, then removes it.
  // Wait until the element is present AND no longer hidden.
  await page.waitForSelector('#storybook-root:not([hidden])', { timeout: 15000 })
}
