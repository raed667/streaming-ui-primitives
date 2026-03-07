/**
 * OpenAI SDK integration example.
 *
 * Demonstrates:
 *  - fromOpenAIChatStream()  — adapter for OpenAI SDK chat completion streams
 *  - useTokenStream()        — text accumulation + status tracking
 *  - StreamGuard             — lifecycle-driven render slots
 *  - StreamingText           — animated text with blinking cursor
 *  - abort()                 — cancel mid-stream, preserve partial text
 *  - Multi-turn history      — full conversation preserved between turns
 *
 * The server emits OpenAI-compatible SSE chunks (chat.completions format).
 * Set USE_REAL_SDK=true in .env to use the real OpenAI API.
 */
import React, { useState, useCallback, useRef } from 'react'
import { useTokenStream, StreamGuard, StreamingText } from 'streaming-ui-primitives'
import { fromOpenAIChatStream } from 'streaming-ui-primitives/adapters'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
}

// Minimal OpenAI chat chunk shape (structural typing — no runtime dep on openai)
interface OpenAIChatChunk {
  choices: Array<{ delta: { content?: string | null } }>
}

export function App() {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<Message[]>([])
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [source, setSource] = useState<AsyncIterable<string> | null>(null)
  const { text, tokenCount, status, error, abort, reset } = useTokenStream(source)
  const abortControllerRef = useRef<AbortController | null>(null)

  const send = useCallback(async () => {
    if (!input.trim() || status === 'streaming') return
    const prompt = input.trim()
    setInput('')
    setCurrentPrompt(prompt)
    reset()

    const ac = new AbortController()
    abortControllerRef.current = ac

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          ...history.map(m => ({ role: m.role, content: m.text })),
          { role: 'user', content: prompt },
        ],
      }),
      signal: ac.signal,
    }).catch(err => { throw err })

    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

    // Parse the OpenAI SSE stream into an AsyncIterable<OpenAIChatChunk>
    const chunkStream = parseOpenAISSE(res.body)

    // fromOpenAIChatStream extracts choices[0].delta.content from each chunk
    setSource(fromOpenAIChatStream(chunkStream))
  }, [input, status, history, reset])

  function handleAbort() {
    abortControllerRef.current?.abort()
    abort()
  }

  function saveAndContinue() {
    if (!currentPrompt || !text) return
    setHistory(prev => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text: currentPrompt },
      { id: crypto.randomUUID(), role: 'assistant', text },
    ])
    setCurrentPrompt('')
    setSource(null)
    reset()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
  }

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <h1 style={styles.title}>OpenAI SDK integration</h1>
        <p style={styles.subtitle}>
          Demonstrates <code>fromOpenAIChatStream</code>, <code>abort()</code>, multi-turn history
        </p>
        {history.length > 0 && (
          <button onClick={() => { setHistory([]); reset(); setCurrentPrompt('') }} style={styles.clearBtn}>
            Clear history
          </button>
        )}
      </div>

      {/* Conversation history */}
      {history.length > 0 && (
        <div style={styles.history}>
          {history.map(m => (
            <div key={m.id} style={m.role === 'user' ? styles.userBubble : styles.assistantBubble}>
              <span style={styles.role}>{m.role === 'user' ? 'You' : 'GPT-4o'}</span>
              <p style={styles.histText}>{m.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Active turn */}
      {currentPrompt && (
        <div style={styles.userBubble}>
          <span style={styles.role}>You</span>
          <p style={styles.histText}>{currentPrompt}</p>
        </div>
      )}

      <StreamGuard
        status={status}
        idle={
          history.length === 0
            ? <p style={styles.idle}>Send a message to start the conversation.</p>
            : null
        }
        streaming={
          <div style={styles.assistantBubble}>
            <span style={styles.role}>GPT-4o</span>
            <StreamingText content={text} isStreaming cursor as="p" style={styles.histText} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={handleAbort} style={styles.abortBtn}>Stop</button>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{tokenCount} tokens</span>
            </div>
          </div>
        }
        complete={
          <div style={styles.assistantBubble}>
            <span style={styles.role}>GPT-4o</span>
            <p style={styles.histText}>{text}</p>
            <button onClick={saveAndContinue} style={styles.continueBtn}>
              Continue conversation
            </button>
          </div>
        }
        error={(err) => (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>Error: {err?.message ?? 'Unknown error'}</p>
            <button onClick={() => { reset(); setCurrentPrompt('') }} style={styles.abortBtn}>Dismiss</button>
          </div>
        )}
        errorValue={error}
      />

      {/* Input */}
      <div style={styles.inputRow}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message GPT-4o… (Enter to send)"
          style={styles.input}
          disabled={status === 'streaming'}
        />
        <button
          onClick={() => void send()}
          disabled={!input.trim() || status === 'streaming'}
          style={styles.sendBtn}
        >
          Send
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Parse OpenAI SSE stream into AsyncIterable<OpenAIChatChunk>
// ---------------------------------------------------------------------------
async function* parseOpenAISSE(body: ReadableStream<Uint8Array>): AsyncIterable<OpenAIChatChunk> {
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
            yield JSON.parse(trimmed.slice(6)) as OpenAIChatChunk
          } catch { /* skip */ }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

const styles: Record<string, React.CSSProperties> = {
  root: { maxWidth: 680, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 12 },
  header: { marginBottom: 8 },
  title: { margin: '0 0 4px', fontSize: 22, fontWeight: 700 },
  subtitle: { margin: '0 0 8px', color: '#6b7280', fontSize: 14 },
  clearBtn: { padding: '4px 10px', fontSize: 12, cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' },
  history: { display: 'flex', flexDirection: 'column', gap: 8 },
  userBubble: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 12px', alignSelf: 'flex-end', maxWidth: '80%' },
  assistantBubble: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px' },
  role: { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'block', marginBottom: 2 },
  histText: { margin: '0 0 8px', fontSize: 14, lineHeight: 1.6, color: '#111827' },
  idle: { color: '#9ca3af', fontSize: 14, textAlign: 'center' as const, padding: '20px 0', margin: 0 },
  abortBtn: { padding: '3px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  continueBtn: { padding: '3px 10px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  errorBox: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px' },
  errorText: { margin: '0 0 8px', color: '#dc2626', fontSize: 14 },
  inputRow: { display: 'flex', gap: 8 },
  input: { flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' },
  sendBtn: { padding: '8px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
}
