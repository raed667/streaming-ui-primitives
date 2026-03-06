import { useMemo } from 'react'
import type { UIMessagePartCompat } from '../types'

export interface UseMessageStreamResult {
  /** Concatenated text from all 'text' parts */
  text: string
  /** Concatenated reasoning from all 'reasoning' parts */
  reasoning: string
  /** Whether any tool-invocation part is in a non-result state */
  hasActiveToolCall: boolean
  /** Whether any reasoning part is present */
  hasReasoning: boolean
  /** All source URLs from 'source-url' parts */
  sourceUrls: Array<{ url: string; title?: string }>
}

/**
 * Bridges Vercel AI SDK's `UIMessage.parts` array to simple derived values.
 *
 * Compatible with any object that has a `parts` array matching the
 * `UIMessagePartCompat` shape — no runtime dependency on the `ai` package.
 *
 * Usage with Vercel AI SDK:
 * ```tsx
 * const { messages, status } = useChat(...)
 * const lastMsg = messages[messages.length - 1]
 * const { text, hasActiveToolCall } = useMessageStream(lastMsg?.parts ?? [])
 * ```
 *
 * Usage with raw parts array:
 * ```tsx
 * const { text } = useMessageStream([{ type: 'text', text: 'hello' }])
 * ```
 */
export function useMessageStream(
  parts: UIMessagePartCompat[],
): UseMessageStreamResult {
  return useMemo(() => {
    let text = ''
    let reasoning = ''
    let hasActiveToolCall = false
    let hasReasoning = false
    const sourceUrls: Array<{ url: string; title?: string }> = []

    for (const part of parts) {
      if (part.type === 'text') {
        text += (part as { type: 'text'; text: string }).text
      } else if (part.type === 'reasoning') {
        reasoning += (part as { type: 'reasoning'; reasoning: string }).reasoning
        hasReasoning = true
      } else if (part.type === 'tool-invocation') {
        const tp = part as { type: 'tool-invocation'; state: string }
        if (tp.state !== 'result') {
          hasActiveToolCall = true
        }
      } else if (part.type === 'source-url') {
        const sp = part as { type: 'source-url'; url: string; title?: string }
        // exactOptionalPropertyTypes: only include title when defined
        if (sp.title !== undefined) {
          sourceUrls.push({ url: sp.url, title: sp.title })
        } else {
          sourceUrls.push({ url: sp.url })
        }
      }
    }

    return { text, reasoning, hasActiveToolCall, hasReasoning, sourceUrls }
  }, [parts])
}
