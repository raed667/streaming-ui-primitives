/**
 * Reasoning Demo — useMessageStream reasoning + sourceUrls.
 *
 * useMessageStream extracts:
 *  - text           — concatenated text parts
 *  - reasoning      — concatenated reasoning parts (model "thinking")
 *  - hasReasoning   — whether any reasoning part exists
 *  - sourceUrls     — source-url parts [{url, title}]
 *
 * The server streams UIMessage.parts JSON lines simulating a model
 * that first "thinks" (reasoning parts) then answers (text parts)
 * and attaches source URLs.
 */
import React, { useState } from 'react'
import { useMessageStream, StreamingText, TypingIndicator } from 'streaming-ui-primitives'
import type { UIMessagePartCompat } from 'streaming-ui-primitives'

export function ReasoningDemo() {
  const [parts, setParts] = useState<UIMessagePartCompat[]>([])
  const [isStreaming, setIsStreaming] = useState(false)

  const { text, reasoning, hasReasoning, hasActiveToolCall, sourceUrls } = useMessageStream(parts)

  async function start() {
    setParts([])
    setIsStreaming(true)

    const res = await fetch('/api/reasoning', { method: 'POST' })
    if (!res.ok || !res.body) { setIsStreaming(false); return }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const part = JSON.parse(trimmed) as UIMessagePartCompat
          setParts(prev => {
            // Merge consecutive text/reasoning parts for efficiency
            const last = prev[prev.length - 1]
            if (part.type === 'text' && last?.type === 'text') {
              const t = (p: UIMessagePartCompat) => (p as { type: 'text'; text: string }).text
              return [...prev.slice(0, -1), { type: 'text', text: t(last) + t(part) }]
            }
            if (part.type === 'reasoning' && last?.type === 'reasoning') {
              const r = (p: UIMessagePartCompat) => (p as { type: 'reasoning'; reasoning: string }).reasoning
              return [...prev.slice(0, -1), { type: 'reasoning', reasoning: r(last) + r(part) }]
            }
            return [...prev, part]
          })
        } catch { /* skip */ }
      }
    }

    setIsStreaming(false)
  }

  function reset() {
    setParts([])
    setIsStreaming(false)
  }

  return (
    <div style={styles.root}>
      <h2 style={styles.heading}>useMessageStream — reasoning + sourceUrls</h2>
      <p style={styles.desc}>
        The server streams <code>UIMessagePart</code> JSON lines. <code>useMessageStream()</code>{' '}
        extracts reasoning, text, tool state, and source URLs from the parts array.
      </p>

      {/* Tool call indicator */}
      <div style={styles.row}>
        <TypingIndicator visible={hasActiveToolCall} variant="bar" aria-label="Running tool" style={{ color: '#f59e0b' }} />
        {hasActiveToolCall && <span style={styles.toolLabel}>Tool running…</span>}
      </div>

      {/* Reasoning section */}
      {(hasReasoning || isStreaming) && (
        <div style={styles.reasoningBox}>
          <div style={styles.reasoningHeader}>
            <span style={styles.reasoningLabel}>Thinking</span>
            <TypingIndicator visible={isStreaming && !text} variant="dots" style={{ color: '#6366f1' }} />
          </div>
          <StreamingText
            content={reasoning}
            isStreaming={isStreaming && !text}
            as="p"
            style={styles.reasoningText}
          />
        </div>
      )}

      {/* Main response */}
      {(text || isStreaming) && (
        <div style={styles.responseBox}>
          <StreamingText
            content={text}
            isStreaming={isStreaming}
            cursor
            as="p"
            style={styles.responseText}
          />
        </div>
      )}

      {/* Source URLs */}
      {sourceUrls.length > 0 && (
        <div style={styles.sourcesBox}>
          <div style={styles.sourcesLabel}>Sources</div>
          <ul style={styles.sourceList}>
            {sourceUrls.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer" style={styles.sourceLink}>
                  {s.title ?? s.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Parts debug view */}
      <details style={styles.debug}>
        <summary style={styles.debugSummary}>Raw parts array ({parts.length} parts)</summary>
        <pre style={styles.debugPre}>{JSON.stringify(parts, null, 2)}</pre>
      </details>

      <div style={styles.actions}>
        <button onClick={start} disabled={isStreaming} style={styles.btn}>
          {isStreaming ? 'Streaming…' : 'Start'}
        </button>
        <button onClick={reset} style={styles.resetBtn}>Reset</button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 14 },
  heading: { margin: '0 0 4px', fontSize: 18, fontWeight: 700 },
  desc: { margin: 0, color: '#4b5563', fontSize: 13, lineHeight: 1.6 },
  row: { display: 'flex', alignItems: 'center', gap: 6, minHeight: 24 },
  toolLabel: { fontSize: 13, color: '#f59e0b', fontWeight: 600 },
  reasoningBox: { background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '10px 14px' },
  reasoningHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  reasoningLabel: { fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' as const, letterSpacing: '0.07em' },
  reasoningText: { margin: 0, fontSize: 13, lineHeight: 1.6, color: '#4338ca', fontStyle: 'italic' },
  responseBox: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px' },
  responseText: { margin: 0, fontSize: 15, lineHeight: 1.7, color: '#111827' },
  sourcesBox: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px' },
  sourcesLabel: { fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6 },
  sourceList: { margin: 0, paddingLeft: 16 },
  sourceLink: { color: '#3b82f6', fontSize: 13 },
  debug: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 },
  debugSummary: { padding: '6px 12px', fontSize: 12, color: '#6b7280', cursor: 'pointer' },
  debugPre: { margin: 0, padding: '8px 12px', fontSize: 11, color: '#374151', overflowX: 'auto', fontFamily: 'ui-monospace, monospace' },
  actions: { display: 'flex', gap: 8 },
  btn: { padding: '7px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  resetBtn: { padding: '7px 14px', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' },
}
