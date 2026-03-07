/**
 * Mock server for the raw-fetch example.
 *
 * Serves four endpoints — one per fromFetchSSE() mode — all streaming the same tokens
 * in the format expected by that mode:
 *
 *  POST /api/stream?mode=auto      → plain text (Content-Type: text/plain)
 *  POST /api/stream?mode=sse-text  → SSE data: plain text lines
 *  POST /api/stream?mode=vercel-ai → Vercel AI SDK data stream (0:"token" lines)
 *  POST /api/stream?mode=sse-json  → SSE data: JSON OpenAI-compatible chunks
 */

import express from 'express'

const app = express()
app.use(express.json())

const TOKENS = [
  'Raw ', 'fetch ', 'streaming ', 'without ', 'any ', 'AI SDK. ',
  'fromFetchSSE() ', 'adapts ', 'the response ', 'body ', 'to ',
  'AsyncIterable<string> ', 'so useTokenStream() ', 'can consume it directly. ',
  'Switch between modes ', 'to see how ', 'each format is parsed.',
]

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

app.post('/api/stream', async (req, res) => {
  const mode = (req.query['mode'] as string) ?? 'auto'

  if (mode === 'auto') {
    // Plain text — auto mode detects via Content-Type: text/plain
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Transfer-Encoding', 'chunked')
    for (const token of TOKENS) {
      if (res.writableEnded) break
      res.write(token)
      await delay(80)
    }
    res.end()
    return
  }

  if (mode === 'sse-text') {
    // SSE with plain text in data: fields
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    for (const token of TOKENS) {
      if (res.writableEnded) break
      res.write(`data: ${token}\n\n`)
      await delay(80)
    }
    res.write('data: [DONE]\n\n')
    res.end()
    return
  }

  if (mode === 'vercel-ai') {
    // Vercel AI SDK data stream protocol: bare 0:"token" lines (no data: prefix)
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    for (const token of TOKENS) {
      if (res.writableEnded) break
      res.write(`0:${JSON.stringify(token)}\n`)
      await delay(80)
    }
    // Finish metadata line
    res.write(`d:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":${TOKENS.length}}}\n`)
    res.end()
    return
  }

  if (mode === 'sse-json') {
    // SSE with OpenAI-compatible JSON chunks
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    for (const token of TOKENS) {
      if (res.writableEnded) break
      const chunk = {
        choices: [{ index: 0, delta: { content: token }, finish_reason: null }],
      }
      res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      await delay(80)
    }
    res.write('data: [DONE]\n\n')
    res.end()
    return
  }

  res.status(400).json({ error: `Unknown mode: ${mode}` })
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Mock raw-fetch server running on http://localhost:${PORT}`)
  console.log('Supports modes: auto, sse-text, vercel-ai, sse-json')
})
