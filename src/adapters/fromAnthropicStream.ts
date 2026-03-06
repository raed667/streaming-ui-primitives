/**
 * Adapter for Anthropic SDK streaming responses.
 *
 * The Anthropic SDK's `client.messages.stream(...)` returns a `Stream<RawMessageStreamEvent>`
 * that emits structured events. This adapter extracts plain text tokens from those events.
 *
 * @example
 * import Anthropic from '@anthropic-ai/sdk'
 * import { fromAnthropicStream } from 'streaming-ui-primitives/adapters'
 *
 * const client = new Anthropic()
 * const stream = await client.messages.stream({ model: 'claude-opus-4-5', max_tokens: 1024, messages })
 * const { text, isStreaming } = useTokenStream(fromAnthropicStream(stream))
 *
 * Note: `stream.textStream` is itself an `AsyncIterable<string>` and works directly with
 * `useTokenStream(stream.textStream)` — no adapter needed in that case.
 *
 * Zero runtime dependency on `@anthropic-ai/sdk` — uses structural typing only.
 */

interface AnthropicStreamEvent {
  type: string
  delta?: { type?: string; text?: string }
}

/**
 * Converts an Anthropic SDK message stream to `AsyncIterable<string>`.
 *
 * Only yields text from `content_block_delta` events where `delta.type === 'text_delta'`.
 * All other event types (message_start, message_stop, content_block_start, etc.) are skipped.
 */
export async function* fromAnthropicStream(
  stream: AsyncIterable<AnthropicStreamEvent>,
): AsyncIterable<string> {
  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta?.type === 'text_delta' &&
      typeof event.delta.text === 'string' &&
      event.delta.text.length > 0
    ) {
      yield event.delta.text
    }
  }
}
