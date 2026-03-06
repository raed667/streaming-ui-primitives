import { useCallback, useEffect, useRef, useState } from 'react'
import type { StreamStatus, TokenSource } from '../types'

export interface UseTokenStreamResult {
  /** Full accumulated text so far */
  text: string
  /** Whether a stream is actively producing tokens */
  isStreaming: boolean
  status: StreamStatus
  error: Error | null
  /** Cancel the in-progress stream without clearing accumulated text. Status becomes 'idle'. */
  abort: () => void
  /** Reset accumulated text and status back to idle. Also cancels any in-progress stream. */
  reset: () => void
}

/**
 * Consumes any token source (AsyncIterable<string> or ReadableStream) and
 * accumulates the text, tracking streaming lifecycle.
 *
 * Compatible with:
 *   - Vercel AI SDK  streamText().textStream   (AsyncIterable<string>)
 *   - Anthropic SDK  stream.textStream         (AsyncIterable<string>)
 *   - LangChain.js   chain.stream()            (AsyncIterable<string>)
 *   - LlamaIndex.TS  engine.chat({ stream })   (AsyncIterable<string>)
 *   - Raw fetch      response.body             (ReadableStream<Uint8Array>)
 *   - OpenAI SDK     stream.toReadableStream() (ReadableStream<Uint8Array>)
 *
 * Pass `null` or `undefined` to keep the hook idle.
 */
export function useTokenStream(
  source: TokenSource | null | undefined,
): UseTokenStreamResult {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<StreamStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  // Ref to abort in-flight consumption on source change / unmount
  const abortRef = useRef<AbortController | null>(null)

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('idle')
    // Note: does NOT clear text — partial response is preserved
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setText('')
    setStatus('idle')
    setError(null)
  }, [])

  useEffect(() => {
    if (source == null) {
      return
    }

    // Cancel any previous stream
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setText('')
    setStatus('streaming')
    setError(null)

    async function consume() {
      try {
        const iterable = toAsyncIterable(source!)
        for await (const chunk of iterable) {
          if (ac.signal.aborted) return
          setText(prev => prev + chunk)
        }
        if (!ac.signal.aborted) {
          setStatus('complete')
        }
      } catch (err) {
        if (ac.signal.aborted) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setStatus('error')
      }
    }

    consume()

    return () => {
      ac.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  return {
    text,
    isStreaming: status === 'streaming',
    status,
    error,
    abort,
    reset,
  }
}

// ---------------------------------------------------------------------------
// Internal: normalise any TokenSource → AsyncIterable<string>
// ---------------------------------------------------------------------------

function toAsyncIterable(source: TokenSource): AsyncIterable<string> {
  // Check ReadableStream FIRST — in some environments (jsdom) ReadableStream
  // also has Symbol.asyncIterator but yields raw bytes, not strings.
  if (isReadableStream(source)) {
    return readableStreamBytesToIterable(source as ReadableStream<Uint8Array>)
  }
  // AsyncIterable (AI SDK textStream, Anthropic, LangChain, LlamaIndex, etc.)
  if (isAsyncIterable(source)) {
    return source as AsyncIterable<string>
  }
  // Fallback: treat as ReadableStream<Uint8Array>
  return readableStreamBytesToIterable(source as ReadableStream<Uint8Array>)
}

function isReadableStream(value: unknown): value is ReadableStream {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as ReadableStream).getReader === 'function'
  )
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return (
    value != null &&
    typeof value === 'object' &&
    Symbol.asyncIterator in (value as object)
  )
}

async function* readableStreamBytesToIterable(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<string> {
  const decoder = new TextDecoder()
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value != null) {
        // jsdom returns a plain object {0:n, 1:n, ...} that reports as Uint8Array
        // but fails instanceof checks. Normalise to a real Uint8Array.
        const bytes =
          value instanceof Uint8Array
            ? value
            : new Uint8Array(Object.values(value as Record<string, number>))
        yield decoder.decode(bytes, { stream: true })
      }
    }
    // Flush decoder
    const flushed = decoder.decode()
    if (flushed) yield flushed
  } finally {
    reader.releaseLock()
  }
}
