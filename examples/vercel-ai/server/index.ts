/**
 * Mock server for the Vercel AI SDK example.
 *
 * Streams newline-delimited JSON UIMessage.parts to the client.
 * Each line is a single UIMessagePart object: { type, text } | { type: 'reasoning', reasoning } | etc.
 *
 * Set USE_REAL_SDK=true in .env to use the real Vercel AI SDK + OpenAI instead.
 *
 * Real SDK equivalent (replace the mock block below):
 * -------------------------------------------------------
 * import { streamText } from 'ai'
 * import { openai } from '@ai-sdk/openai'
 *
 * const result = streamText({
 *   model: openai('gpt-4o'),
 *   messages,
 * })
 *
 * for await (const part of result.fullStream) {
 *   if (part.type === 'text-delta') {
 *     res.write(JSON.stringify({ type: 'text', text: part.textDelta }) + '\n')
 *   }
 * }
 * -------------------------------------------------------
 */

import express from 'express'

const app = express()
app.use(express.json())

const TOKENS = [
  'The ', 'quick ', 'brown ', 'fox ', 'jumps ', 'over ', 'the ', 'lazy ', 'dog. ',
  'Here is a longer sentence demonstrating how streaming-ui-primitives accumulates ',
  'tokens one by one, giving users a real-time sense of the response forming. ',
  'You can abort mid-stream, reset to clear, or let it complete naturally.',
]

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

app.post('/api/chat', async (_req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.setHeader('Cache-Control', 'no-cache')

  // Simulate a brief "submitted" delay
  await delay(200)

  // Stream a reasoning part first (demonstrates useMessageStream reasoning field)
  const reasoningTokens = ['Thinking about this...', ' The question is about streaming UI patterns.']
  for (const token of reasoningTokens) {
    res.write(JSON.stringify({ type: 'reasoning', reasoning: token }) + '\n')
    await delay(60)
  }

  // Stream the main text response
  for (const token of TOKENS) {
    res.write(JSON.stringify({ type: 'text', text: token }) + '\n')
    await delay(80)
  }

  // Optionally send source URLs
  res.write(JSON.stringify({
    type: 'source-url',
    url: 'https://github.com/raed-chammam/streaming-ui-primitives',
    title: 'streaming-ui-primitives on GitHub',
  }) + '\n')

  res.end()
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`)
  console.log('Set USE_REAL_SDK=true in .env to use the real Vercel AI SDK')
})
