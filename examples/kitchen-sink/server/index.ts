/**
 * Mock server for the kitchen-sink example.
 *
 * Endpoints:
 *  POST /api/stream?mode=sse-text   — SSE plain text (used by most demos)
 *  POST /api/markdown               — SSE plain text with markdown content
 *  POST /api/reasoning              — NDJSON UIMessage.parts (reasoning + text + sources)
 *  POST /api/error                  — always returns 500 (for StreamGuard error demo)
 */

import express from 'express'

const app = express()
app.use(express.json())

const TOKENS = [
  'This ', 'is ', 'a ', 'streaming ', 'response ', 'from ',
  'the ', 'mock ', 'server. ', 'Each ', 'token ', 'arrives ',
  'at ', '80ms ', 'intervals, ', 'simulating ', 'a ', 'real ',
  'LLM ', 'stream.',
]

const MARKDOWN_TOKENS = [
  '# Streaming Markdown\n\n',
  'Here is a **bold** statement and some `inline code`.\n\n',
  '## Features\n\n',
  '- Token-by-token streaming\n',
  '- Real-time markdown rendering\n',
  '- Graceful error boundary via `PartialRender`\n\n',
  '## Code Example\n\n',
  '```tsx\n',
  '<PartialRender\n',
  '  content={text}\n',
  '  renderer={(c) => <div dangerouslySetInnerHTML={{ __html: marked(c) }} />}\n',
  '/>\n',
  '```\n\n',
  'The error boundary catches incomplete markdown during streaming and falls back to plain text.',
]

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Generic SSE text stream
app.post('/api/stream', async (req, res) => {
  const mode = (req.query['mode'] as string) ?? 'sse-text'

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  await delay(100)

  if (mode === 'sse-text') {
    for (const token of TOKENS) {
      if (res.writableEnded) break
      res.write(`data: ${token}\n\n`)
      await delay(80)
    }
    res.write('data: [DONE]\n\n')
  }

  res.end()
})

// Markdown stream — SSE with JSON-encoded token so newlines are preserved
app.post('/api/markdown', async (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')

  await delay(100)

  for (const token of MARKDOWN_TOKENS) {
    if (res.writableEnded) break
    res.write(`data: ${JSON.stringify({ text: token })}\n\n`)
    await delay(120)
  }

  res.write('data: [DONE]\n\n')
  res.end()
})

// Reasoning stream — NDJSON UIMessage.parts
app.post('/api/reasoning', async (_req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Transfer-Encoding', 'chunked')

  await delay(150)

  // Reasoning parts first
  const reasoningParts = [
    'Let me think about this carefully. ',
    'The question involves streaming UI patterns. ',
    'I should explain reasoning + text + source URL parts.',
  ]
  for (const r of reasoningParts) {
    res.write(JSON.stringify({ type: 'reasoning', reasoning: r }) + '\n')
    await delay(80)
  }

  // Brief tool call simulation
  res.write(JSON.stringify({
    type: 'tool-invocation',
    toolCallId: 'call_1',
    toolName: 'web_search',
    state: 'call',
    args: { query: 'streaming UI primitives' },
  }) + '\n')
  await delay(400)

  res.write(JSON.stringify({
    type: 'tool-invocation',
    toolCallId: 'call_1',
    toolName: 'web_search',
    state: 'result',
    args: { query: 'streaming UI primitives' },
    result: { snippets: ['Found relevant results.'] },
  }) + '\n')
  await delay(100)

  // Text response
  const textParts = [
    'Based on my research: ',
    'streaming-ui-primitives provides ',
    'unstyled React primitives for generative UI. ',
    'The useMessageStream() hook extracts ',
    'text, reasoning, tool state, and source URLs ',
    'from a UIMessage.parts array.',
  ]
  for (const t of textParts) {
    res.write(JSON.stringify({ type: 'text', text: t }) + '\n')
    await delay(80)
  }

  // Source URLs
  res.write(JSON.stringify({
    type: 'source-url',
    url: 'https://github.com/raed-chammam/streaming-ui-primitives',
    title: 'streaming-ui-primitives on GitHub',
  }) + '\n')
  res.write(JSON.stringify({
    type: 'source-url',
    url: 'https://www.npmjs.com/package/streaming-ui-primitives',
    title: 'npm: streaming-ui-primitives',
  }) + '\n')

  res.end()
})

// Error endpoint — for StreamGuard error state demo
app.post('/api/error', (_req, res) => {
  res.status(500).json({ error: 'Simulated server error for StreamGuard demo' })
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Kitchen-sink mock server running on http://localhost:${PORT}`)
})
