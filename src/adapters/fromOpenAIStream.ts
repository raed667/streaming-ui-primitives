/**
 * Adapters for OpenAI SDK streaming responses.
 *
 * The OpenAI Node SDK (v4+) exposes streams that can be converted to
 * `AsyncIterable<string>` for use with `useTokenStream`.
 *
 * These adapters have **zero runtime dependency** on the OpenAI SDK —
 * they accept the shapes structurally via TypeScript generics.
 */

/**
 * Minimal structural type matching OpenAI SDK's streaming chunk shape.
 * Compatible with `openai` v4+.
 */
interface OpenAIChatChunk {
  choices: Array<{
    delta: {
      content?: string | null
    }
  }>
}

/**
 * Converts an OpenAI SDK chat completion stream to `AsyncIterable<string>`.
 *
 * Works with:
 *   - `openai.chat.completions.stream(...)` (returns AsyncIterable<ChatCompletionChunk>)
 *   - Any async iterable of objects with `.choices[0].delta.content`
 *
 * @example
 * import OpenAI from 'openai'
 * import { fromOpenAIChatStream } from 'streaming-ui-primitives/adapters'
 *
 * const openai = new OpenAI()
 * const stream = openai.chat.completions.stream({ model: 'gpt-4o', messages, stream: true })
 * const tokenStream = fromOpenAIChatStream(stream)
 *
 * // In a component:
 * const { text, isStreaming } = useTokenStream(tokenStream)
 */
export async function* fromOpenAIChatStream(
  stream: AsyncIterable<OpenAIChatChunk>,
): AsyncIterable<string> {
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content
    if (content != null && content.length > 0) {
      yield content
    }
  }
}

/**
 * Minimal structural type matching OpenAI SDK's text completion stream shape.
 */
interface OpenAICompletionChunk {
  choices: Array<{
    text?: string | null
  }>
}

/**
 * Converts an OpenAI SDK text completion stream to `AsyncIterable<string>`.
 *
 * @example
 * const stream = openai.completions.create({ model: 'gpt-3.5-turbo-instruct', prompt, stream: true })
 * const tokenStream = fromOpenAICompletionStream(stream)
 */
export async function* fromOpenAICompletionStream(
  stream: AsyncIterable<OpenAICompletionChunk>,
): AsyncIterable<string> {
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.text
    if (text != null && text.length > 0) {
      yield text
    }
  }
}
