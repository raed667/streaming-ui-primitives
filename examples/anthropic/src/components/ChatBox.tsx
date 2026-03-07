/**
 * ChatBox — demonstrates fromAnthropicStream + abort().
 *
 * The server sends Anthropic SDK-compatible SSE events:
 *   data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"token"}}
 *
 * fromAnthropicStream() parses these and yields text strings.
 * useTokenStream() accumulates them and tracks streaming status.
 *
 * Option B (no adapter needed):
 *   If you call the Anthropic SDK directly on the client, use:
 *   const stream = client.messages.stream({ ... })
 *   const { text } = useTokenStream(stream.textStream)  // stream.textStream is AsyncIterable<string>
 */
import React, { useState, useRef } from 'react'
import { useTokenStream, StreamGuard, StreamingText } from 'streaming-ui-primitives'
import { fromAnthropicStream } from 'streaming-ui-primitives/adapters'

interface Props {
  onComplete: (prompt: string, response: string) => void
}

// Minimal type matching Anthropic SDK stream event shape (structural typing)
interface AnthropicEvent {
  type: string
  delta?: { type?: string; text?: string }
}

export function ChatBox({ onComplete }: Props) {
  const [input, setInput] = useState('')
  const [prompt, setPrompt] = useState('')
  const [source, setSource] = useState<AsyncIterable<string> | null>(null)
  const { text, status, error, abort, reset } = useTokenStream(source)
  const prevTextRef = useRef('')

  // When stream completes, bubble up to parent history
  React.useEffect(() => {
    if (status === 'complete' && text) {
      prevTextRef.current = text
    }
  }, [status, text])

  async function send() {
    if (!input.trim() || status === 'streaming') return
    const p = input.trim()
    setPrompt(p)
    setInput('')
    reset()

    const res = await fetch('/api/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: p }),
    })

    if (!res.ok || !res.body) {
      // Let useTokenStream surface the error by passing a failing iterable
      setSource(failingIterable(`HTTP ${res.status}`))
      return
    }

    // Parse Anthropic SSE stream into an AsyncIterable<AnthropicEvent>
    const eventStream = parseAnthropicSSE(res.body)

    // fromAnthropicStream wraps it → AsyncIterable<string>
    setSource(fromAnthropicStream(eventStream))
  }

  function handleAbort() {
    abort() // stops stream, preserves partial text
  }

  function handleReset() {
    reset() // stops stream AND clears text
    setPrompt('')
    setSource(null)
  }

  function handleComplete() {
    if (text) onComplete(prompt, text)
    handleReset()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={styles.root}>
      {prompt && (
        <div style={styles.promptBubble}>
          <span style={styles.role}>You</span>
          <p style={styles.promptText}>{prompt}</p>
        </div>
      )}

      <StreamGuard
        status={status}
        idle={
          <p style={styles.idle}>Send a message to start streaming.</p>
        }
        streaming={
          <div style={styles.response}>
            <StreamingText content={text} isStreaming cursor as="p" style={styles.responseText} />
            <div style={styles.actions}>
              <button onClick={handleAbort} style={styles.abortBtn}>
                Stop (preserve text)
              </button>
            </div>
          </div>
        }
        complete={
          <div style={styles.response}>
            <p style={styles.responseText}>{text}</p>
            <div style={styles.actions}>
              <button onClick={handleComplete} style={styles.saveBtn}>Save to history</button>
              <button onClick={handleReset} style={styles.resetBtn}>Clear</button>
            </div>
          </div>
        }
        error={(err) => (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>Error: {err?.message ?? 'Unknown error'}</p>
            <button onClick={handleReset} style={styles.resetBtn}>Retry</button>
          </div>
        )}
        errorValue={error}
      />

      <div style={styles.inputRow}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Claude something… (Enter to send)"
          style={styles.input}
          disabled={status === 'streaming'}
        />
        <button
          onClick={send}
          disabled={!input.trim() || status === 'streaming'}
          style={styles.sendBtn}
        >
          Send
        </button>
      </div>

      <p style={styles.hint}>
        <strong>abort()</strong> stops streaming but keeps the partial response.{' '}
        <strong>reset()</strong> clears everything.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function* parseAnthropicSSE(body: ReadableStream<Uint8Array>): AsyncIterable<AnthropicEvent> {
  const decoder = new TextDecoder()
  const reader = body.getReader()
  let buf = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
          try {
            yield JSON.parse(trimmed.slice(6)) as AnthropicEvent
          } catch { /* skip malformed */ }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

async function* failingIterable(msg: string): AsyncIterable<string> {
  throw new Error(msg)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  yield '' // make TypeScript happy
}

const styles: Record<string, React.CSSProperties> = {
  root: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  promptBubble: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', alignSelf: 'flex-end', maxWidth: '80%' },
  role: { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'block', marginBottom: 2 },
  promptText: { margin: 0, fontSize: 14, color: '#111827' },
  idle: { margin: 0, color: '#9ca3af', fontSize: 14, textAlign: 'center' as const, padding: '16px 0' },
  response: { display: 'flex', flexDirection: 'column', gap: 8 },
  responseText: { margin: 0, lineHeight: 1.7, color: '#111827', fontSize: 15 },
  actions: { display: 'flex', gap: 8 },
  abortBtn: { padding: '4px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  saveBtn: { padding: '4px 12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  resetBtn: { padding: '4px 12px', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  errorBox: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px' },
  errorText: { margin: '0 0 8px', color: '#dc2626', fontSize: 14 },
  inputRow: { display: 'flex', gap: 8 },
  input: { flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' },
  sendBtn: { padding: '8px 18px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  hint: { margin: 0, fontSize: 12, color: '#9ca3af' },
}
