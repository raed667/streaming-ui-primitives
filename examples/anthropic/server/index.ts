/**
 * Mock server for the Anthropic SDK example.
 *
 * Emits Anthropic SDK-compatible SSE events:
 *   data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"token"}}
 *   data: {"type":"message_stop"}
 *
 * The client uses fromAnthropicStream() to parse these events.
 *
 * Set USE_REAL_SDK=true in .env to use the real Anthropic SDK.
 *
 * Real SDK equivalent (replace the mock block below):
 * -------------------------------------------------------
 * import Anthropic from '@anthropic-ai/sdk'
 * const client = new Anthropic()
 * const stream = client.messages.stream({
 *   model: 'claude-opus-4-5',
 *   max_tokens: 1024,
 *   messages: [{ role: 'user', content: prompt }],
 * })
 * for await (const event of stream) {
 *   res.write(`data: ${JSON.stringify(event)}\n\n`)
 * }
 * -------------------------------------------------------
 */

import express from 'express'

const app = express()
app.use(express.json())

const TOKENS = [
  'Hello! ', 'I\'m Claude, ', 'an AI assistant ', 'made by Anthropic. ',
  'This response is streaming ', 'token by token, ', 'demonstrating how ',
  'streaming-ui-primitives ', 'accumulates text in real time. ',
  'The abort() method stops the stream ', 'but preserves partial text, ',
  'while reset() clears everything. ',
  'Try clicking "Stop" mid-stream to see the difference!',
]

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

app.post('/api/stream', async (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // message_start event
  res.write(`data: ${JSON.stringify({ type: 'message_start' })}\n\n`)
  await delay(100)

  // content_block_start
  res.write(`data: ${JSON.stringify({ type: 'content_block_start', index: 0 })}\n\n`)

  // Stream tokens as content_block_delta events
  for (const token of TOKENS) {
    if (res.writableEnded) break
    res.write(`data: ${JSON.stringify({
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: token },
    })}\n\n`)
    await delay(80)
  }

  // content_block_stop + message_stop
  res.write(`data: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`)
  res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`)
  res.end()
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Mock Anthropic server running on http://localhost:${PORT}`)
  console.log('Set USE_REAL_SDK=true in .env to use the real Anthropic SDK')
})
