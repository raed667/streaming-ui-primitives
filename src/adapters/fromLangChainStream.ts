/**
 * Adapter for LangChain.js streaming responses.
 *
 * LangChain chains and runnables return an `AsyncIterable` when called with
 * `.stream()`. Chunks are typed as `string` for StringOutputParser chains, or
 * as `AIMessageChunk` for raw chat model outputs.
 *
 * This adapter normalises both forms to `AsyncIterable<string>` so you can
 * pass the result directly to `useTokenStream`.
 *
 * @example
 * // StringOutputParser chain (already yields strings)
 * import { fromLangChainStream } from 'streaming-ui-primitives/adapters'
 *
 * const chain = prompt.pipe(model).pipe(new StringOutputParser())
 * const stream = await chain.stream({ question: userInput })
 * setSource(fromLangChainStream(stream))
 *
 * @example
 * // Raw ChatModel (yields AIMessageChunk — content extracted automatically)
 * const stream = await model.stream(messages)
 * setSource(fromLangChainStream(stream))
 */

/** Minimal shape of a LangChain AIMessageChunk we need to extract text. */
interface LangChainMessageChunk {
  content: string | Array<{ type: string; text?: string }>
}

function chunkToText(chunk: unknown): string {
  if (typeof chunk === 'string') return chunk

  const c = chunk as LangChainMessageChunk
  if (typeof c?.content === 'string') return c.content

  if (Array.isArray(c?.content)) {
    return c.content
      .map(part => (part.type === 'text' && part.text != null ? part.text : ''))
      .join('')
  }

  return String(chunk)
}

export async function* fromLangChainStream(
  stream: AsyncIterable<unknown>,
): AsyncIterable<string> {
  for await (const chunk of stream) {
    const text = chunkToText(chunk)
    if (text.length > 0) yield text
  }
}
