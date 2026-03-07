/**
 * Converts a raw `fetch` Response body (Server-Sent Events) into an
 * `AsyncIterable<string>` that yields text tokens.
 *
 * Handles both:
 *  - Plain text streams (each chunk is a raw token)
 *  - SSE streams with `data:` prefix (Vercel AI SDK data stream protocol,
 *    OpenAI-compatible endpoints, etc.)
 *
 * @example
 * // Plain text stream
 * const res = await fetch('/api/stream')
 * const stream = fromFetchSSE(res)
 * const { text } = useTokenStream(stream) // but you'd call this outside a component
 *
 * @example
 * // SSE stream with data: prefix (Vercel AI SDK text stream protocol)
 * const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify(payload) })
 * for await (const token of fromFetchSSE(res, { mode: 'sse-text' })) {
 *   console.log(token)
 * }
 */

/**
 * `sse-text` limitation: tokens must not contain literal newlines (`\n`).
 *
 * SSE frames are delimited by `\n\n`. A token with an embedded newline will be
 * split into multiple lines — the `data:` prefix is stripped from the first
 * line only, so continuation lines are silently dropped.
 *
 * If your tokens may contain newlines (e.g. markdown), use `sse-json` and
 * JSON-encode each token on the server:
 *
 * ```ts
 * // server
 * res.write(`data: ${JSON.stringify({ text: token })}\n\n`)
 *
 * // client
 * fromFetchSSE(res, { mode: 'sse-json', jsonPath: 'text' })
 * ```
 */
export type FetchSSEMode =
  | 'auto'       // sniff the response: check Content-Type, fall through
  | 'text'       // raw text/event-stream — yield each decoded chunk as-is
  | 'sse-text'   // SSE with plain text in data fields (tokens must not contain \n — see above)
  | 'sse-json'   // SSE with JSON objects; extract field by jsonPath
  | 'vercel-ai'  // Vercel AI SDK data stream protocol (0:"token" lines)

export interface FetchSSEOptions {
  mode?: FetchSSEMode
  /**
   * For `sse-json` mode: dot-path to extract from each JSON object.
   * @default 'choices.0.delta.content' (OpenAI-compatible)
   */
  jsonPath?: string
}

export async function* fromFetchSSE(
  response: Response,
  options: FetchSSEOptions = {},
): AsyncIterable<string> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  if (response.body == null) {
    throw new Error('Response body is null')
  }

  const { mode = 'auto', jsonPath = 'choices.0.delta.content' } = options
  const contentType = response.headers.get('content-type') ?? ''

  const resolvedMode: Exclude<FetchSSEMode, 'auto'> =
    mode !== 'auto'
      ? mode
      : contentType.includes('text/event-stream')
        ? 'sse-text'
        : 'text'

  const decoder = new TextDecoder()
  const reader = response.body.getReader()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      if (resolvedMode === 'text') {
        yield buffer
        buffer = ''
        continue
      }

      // SSE modes: split on double-newline event boundaries
      const lines = buffer.split('\n')
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()

        if (resolvedMode === 'vercel-ai') {
          if (trimmed.startsWith('0:')) {
            try {
              const text = JSON.parse(trimmed.slice(2)) as unknown
              if (typeof text === 'string' && text.length > 0) yield text
            } catch {
              // ignore malformed
            }
          }
          continue
        }

        if (!trimmed || trimmed.startsWith(':')) continue // empty / comment
        if (trimmed === 'data: [DONE]') continue          // OpenAI terminator

        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6)

          if (resolvedMode === 'sse-text') {
            yield data
          } else {
            // sse-json
            try {
              const parsed = JSON.parse(data) as unknown
              const extracted = getNestedValue(parsed, jsonPath)
              if (typeof extracted === 'string' && extracted.length > 0) {
                yield extracted
              }
            } catch {
              // Ignore malformed JSON chunks (partial JSON during streaming)
            }
          }
        }
      }
    }

    // Flush decoder
    const flushed = decoder.decode()
    if (flushed && resolvedMode === 'text') yield flushed
  } finally {
    reader.releaseLock()
  }
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined
    if (Array.isArray(acc)) {
      const idx = Number(key)
      return isNaN(idx) ? undefined : acc[idx]
    }
    return (acc as Record<string, unknown>)[key]
  }, obj)
}
