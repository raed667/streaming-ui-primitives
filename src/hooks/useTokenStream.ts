import { useCallback, useEffect, useRef, useState } from 'react'
import type { StreamStatus, TokenSource } from '../types'

export interface UseTokenStreamOptions {
  /**
   * Called each time a new token arrives.
   * Stable reference recommended (useCallback), but the hook always uses the
   * latest value via a ref so stale-closure bugs are avoided.
   */
  onToken?: (token: string) => void
  /**
   * Called once when the stream completes successfully, with the full text.
   */
  onComplete?: (text: string) => void
  /**
   * Called if the stream errors. Receives the error object.
   */
  onError?: (error: Error) => void
}

export interface UseTokenStreamResult {
  /** Full accumulated text so far */
  text: string
  /** Number of tokens received so far */
  tokenCount: number
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
  options?: UseTokenStreamOptions,
): UseTokenStreamResult {
  const [text, setText] = useState('')
  const [tokenCount, setTokenCount] = useState(0)
  const [status, setStatus] = useState<StreamStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  // Ref to abort in-flight consumption on source change / unmount
  const abortRef = useRef<AbortController | null>(null)
  // Always-current refs for callbacks — avoids stale closures without
  // requiring stable references from the caller.
  const onTokenRef = useRef(options?.onToken)
  const onCompleteRef = useRef(options?.onComplete)
  const onErrorRef = useRef(options?.onError)
  onTokenRef.current = options?.onToken
  onCompleteRef.current = options?.onComplete
  onErrorRef.current = options?.onError

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
    setTokenCount(0)
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
    setTokenCount(0)
    setStatus('streaming')
    setError(null)

    async function consume() {
      try {
        const iterable = toAsyncIterable(source!)
        let accumulated = ''
        for await (const chunk of iterable) {
          if (ac.signal.aborted) return
          accumulated += chunk
          setText(prev => prev + chunk)
          setTokenCount(prev => prev + 1)
          onTokenRef.current?.(chunk)
        }
        if (!ac.signal.aborted) {
          setStatus('complete')
          onCompleteRef.current?.(accumulated)
        }
      } catch (err) {
        if (ac.signal.aborted) return
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        setStatus('error')
        onErrorRef.current?.(e)
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
    tokenCount,
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
