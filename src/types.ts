/**
 * Streaming lifecycle status.
 *
 * Maps cleanly to Vercel AI SDK useChat status:
 *   'submitted' → 'submitted'  (request sent, waiting for first token)
 *   'streaming' → 'streaming'
 *   'ready'     → 'complete'
 *   'error'     → 'error'
 */
export type StreamStatus = 'idle' | 'submitted' | 'streaming' | 'complete' | 'error'

/**
 * Anything that yields string tokens.
 * Covers:
 *  - Vercel AI SDK: streamText().textStream  (AsyncIterable<string>)
 *  - Anthropic SDK: stream.textStream         (AsyncIterable<string>)
 *  - LangChain.js:  chain.stream()            (AsyncIterable<string>)
 *  - LlamaIndex.TS: engine.chat({ stream })   (AsyncIterable<string>)
 *  - Raw fetch:     response.body             (ReadableStream<Uint8Array>)
 *  - OpenAI SDK:    stream.toReadableStream() (ReadableStream<Uint8Array>)
 */
export type TokenSource =
  | AsyncIterable<string>
  | ReadableStream<Uint8Array>
  | ReadableStream<string>

// ---------------------------------------------------------------------------
// AI SDK type compatibility (imported as type-only — zero runtime coupling)
// ---------------------------------------------------------------------------

/**
 * Subset of Vercel AI SDK's UIMessagePart that we consume.
 * Using a structural type so consumers don't need `ai` installed.
 *
 * Full type: import type { UIMessagePart } from 'ai'
 */
export type UIMessagePartCompat =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; reasoning: string }
  | { type: 'tool-invocation'; toolCallId: string; toolName: string; state: string }
  | { type: 'source-url'; url: string; title?: string }
  | { type: 'source-document'; mediaType: string; title?: string }
  | { type: 'file'; url: string; mediaType: string; filename?: string }
  | { type: string; [key: string]: unknown } // catch-all for forward compat

/**
 * Subset of Vercel AI SDK's UIMessage that we accept.
 * Structural — no runtime dependency on `ai`.
 *
 * Full type: import type { UIMessage } from 'ai'
 */
export interface UIMessageCompat {
  id: string
  role: 'user' | 'assistant' | 'system' | string
  parts: UIMessagePartCompat[]
  metadata?: Record<string, unknown>
}

/**
 * Vercel AI SDK useChat status values mapped to our StreamStatus.
 *
 * useChat returns: 'submitted' | 'streaming' | 'ready' | 'error'
 */
export type UseChatStatus = 'submitted' | 'streaming' | 'ready' | 'error'

export function fromUseChatStatus(status: UseChatStatus): StreamStatus {
  const map: Record<UseChatStatus, StreamStatus> = {
    submitted: 'submitted',
    streaming: 'streaming',
    ready: 'complete',
    error: 'error',
  }
  return map[status]
}
