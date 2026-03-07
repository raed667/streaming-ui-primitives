/**
 * Mock server for the OpenAI SDK example.
 *
 * Emits OpenAI-compatible SSE chunks (chat completions format):
 *   data: {"choices":[{"delta":{"content":"token"},"index":0}]}
 *   data: [DONE]
 *
 * The client uses fromOpenAIChatStream() to parse these.
 *
 * Set USE_REAL_SDK=true in .env to use the real OpenAI API.
 *
 * Real SDK equivalent (replace the mock block below):
 * -------------------------------------------------------
 * import OpenAI from 'openai'
 * const openai = new OpenAI()
 * const stream = openai.chat.completions.stream({
 *   model: 'gpt-4o',
 *   messages,
 *   stream: true,
 * })
 * for await (const chunk of stream) {
 *   res.write(`data: ${JSON.stringify(chunk)}\n\n`)
 * }
 * res.write('data: [DONE]\n\n')
 * -------------------------------------------------------
 */

import express from 'express'

const app = express()
app.use(express.json())

const TOKENS = [
  'Hello! ', 'I\'m GPT-4o, ', 'your AI assistant. ',
  'This is a multi-turn chat demonstration ', 'using streaming-ui-primitives ',
  'with the OpenAI SDK adapter. ',
  'Each message in the conversation history ', 'is passed back to the model ',
  'so it maintains context. ',
  'You can abort mid-stream and the partial text ', 'is preserved thanks to abort(). ',
  'Click "Continue conversation" to save this response ', 'and ask a follow-up question.',
]

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

app.post('/api/chat', async (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  await delay(150)

  for (const token of TOKENS) {
    if (res.writableEnded) break
    const chunk = {
      id: `chatcmpl-mock`,
      object: 'chat.completion.chunk',
      choices: [{ index: 0, delta: { content: token }, finish_reason: null }],
    }
    res.write(`data: ${JSON.stringify(chunk)}\n\n`)
    await delay(80)
  }

  // Final chunk with finish_reason
  const finalChunk = {
    id: `chatcmpl-mock`,
    object: 'chat.completion.chunk',
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  }
  res.write(`data: ${JSON.stringify(finalChunk)}\n\n`)
  res.write('data: [DONE]\n\n')
  res.end()
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Mock OpenAI server running on http://localhost:${PORT}`)
  console.log('Set USE_REAL_SDK=true in .env to use the real OpenAI API')
})
