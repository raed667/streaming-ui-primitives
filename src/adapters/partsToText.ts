import type { UIMessagePartCompat } from '../types'

/**
 * Extracts plain text from a Vercel AI SDK `UIMessage.parts` array.
 *
 * Concatenates all `type: 'text'` parts in order. Other part types
 * (tool-invocation, reasoning, source-url, file) are ignored unless
 * `includeReasoning` is set.
 *
 * No runtime dependency on the `ai` package — accepts any array of objects
 * matching the `UIMessagePartCompat` shape.
 *
 * @example
 * import { partsToText } from 'streaming-ui-primitives/adapters'
 *
 * const { messages } = useChat(...)
 * const lastMessage = messages[messages.length - 1]
 * const text = partsToText(lastMessage.parts)
 */
export function partsToText(
  parts: UIMessagePartCompat[],
  options: { includeReasoning?: boolean } = {},
): string {
  const { includeReasoning = false } = options
  let result = ''
  for (const part of parts) {
    if (part.type === 'text') {
      result += (part as { type: 'text'; text: string }).text
    } else if (includeReasoning && part.type === 'reasoning') {
      result += (part as { type: 'reasoning'; reasoning: string }).reasoning
    }
  }
  return result
}

/**
 * Checks whether any part indicates an active tool invocation
 * (not yet resolved to a result).
 *
 * @example
 * const isToolRunning = hasActiveToolCall(message.parts)
 */
export function hasActiveToolCall(parts: UIMessagePartCompat[]): boolean {
  return parts.some(
    p =>
      p.type === 'tool-invocation' &&
      (p as { type: 'tool-invocation'; state: string }).state !== 'result',
  )
}
