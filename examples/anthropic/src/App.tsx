/**
 * Anthropic SDK integration example.
 *
 * Demonstrates:
 *  - fromAnthropicStream()  — adapter for raw Anthropic SDK message streams
 *  - useTokenStream()       — consuming the adapter output
 *  - StreamingText          — animated text with blinking cursor
 *  - abort()                — stop mid-stream and preserve partial text
 *  - StreamGuard            — idle / streaming / complete / error states
 *
 * The server emits Anthropic-compatible SSE events (content_block_delta).
 * Set USE_REAL_SDK=true in .env to use the real Anthropic SDK.
 *
 * Note on Option B:
 * If you have the Anthropic SDK on the client side, you can also pass
 * `stream.textStream` (AsyncIterable<string>) directly to useTokenStream()
 * without any adapter — the comment in ChatBox.tsx shows both options.
 */
import React, { useState } from 'react'
import { ChatBox } from './components/ChatBox'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export function App() {
  const [history, setHistory] = useState<Message[]>([])

  function onComplete(prompt: string, response: string) {
    setHistory(prev => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text: prompt },
      { id: crypto.randomUUID(), role: 'assistant', text: response },
    ])
  }

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <h1 style={styles.title}>Anthropic SDK integration</h1>
        <p style={styles.subtitle}>
          Demonstrates <code>fromAnthropicStream</code>, <code>abort()</code>, <code>StreamGuard</code>
        </p>
      </div>

      {/* Previous messages */}
      {history.length > 0 && (
        <div style={styles.history}>
          {history.map(m => (
            <div key={m.id} style={m.role === 'user' ? styles.userBubble : styles.assistantBubble}>
              <span style={styles.role}>{m.role === 'user' ? 'You' : 'Claude'}</span>
              <p style={styles.historyText}>{m.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Active chat box with streaming */}
      <ChatBox onComplete={onComplete} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: { maxWidth: 680, margin: '0 auto', padding: '24px 16px' },
  header: { marginBottom: 24 },
  title: { margin: '0 0 4px', fontSize: 22, fontWeight: 700 },
  subtitle: { margin: 0, color: '#6b7280', fontSize: 14 },
  history: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  userBubble: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 12px', alignSelf: 'flex-end', maxWidth: '80%' },
  assistantBubble: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 12px' },
  role: { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'block', marginBottom: 2 },
  historyText: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#111827' },
}
