/**
 * Adapter for LlamaIndex.TS streaming responses.
 *
 * LlamaIndex `engine.chat({ stream: true })` returns an `AsyncIterable` of
 * `ChatResponseChunk` objects. Each chunk has a `delta` string field with
 * the token text.
 *
 * This adapter extracts `delta` from each chunk and yields it as a plain
 * string, making it compatible with `useTokenStream`.
 *
 * @example
 * import { fromLlamaIndexStream } from 'streaming-ui-primitives/adapters'
 *
 * const response = await engine.chat({ message: userInput, stream: true })
 * setSource(fromLlamaIndexStream(response))
 */

/** Minimal shape of a LlamaIndex ChatResponseChunk. */
interface LlamaIndexChunk {
  delta: string
}

function chunkToText(chunk: unknown): string {
  if (typeof chunk === 'string') return chunk

  const delta = (chunk as LlamaIndexChunk)?.delta
  if (typeof delta === 'string') return delta

  return ''
}

export async function* fromLlamaIndexStream(
  stream: AsyncIterable<unknown>,
): AsyncIterable<string> {
  for await (const chunk of stream) {
    const text = chunkToText(chunk)
    if (text.length > 0) yield text
  }
}
