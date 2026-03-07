/**
 * TypingIndicator Demo — all three variants.
 *
 * Also demonstrates hasActiveToolCall from useMessageStream:
 * show TypingIndicator while a tool call is running.
 */
import React, { useState } from 'react'
import { TypingIndicator, useTokenStream, StreamingText } from 'streaming-ui-primitives'
import { fromFetchSSE } from 'streaming-ui-primitives/adapters'
import type { TypingIndicatorVariant } from 'streaming-ui-primitives'

const VARIANTS: TypingIndicatorVariant[] = ['dots', 'pulse', 'bar']

export function TypingIndicatorDemo() {
  const [source, setSource] = useState<AsyncIterable<string> | null>(null)
  const { text, status, reset } = useTokenStream(source)
  const isStreaming = status === 'streaming'

  async function start() {
    reset()
    const res = await fetch('/api/stream?mode=sse-text', { method: 'POST' })
    setSource(fromFetchSSE(res, { mode: 'sse-text' }))
  }

  return (
    <div style={styles.root}>
      <h2 style={styles.heading}>TypingIndicator</h2>
      <p style={styles.desc}>
        Three built-in variants — all unstyled, inheriting color from their parent.
        Toggle streaming to see them animate.
      </p>

      {/* Static variant showcase */}
      <div style={styles.grid}>
        {VARIANTS.map(variant => (
          <div key={variant} style={styles.variantCard}>
            <div style={styles.variantLabel}><code>{variant}</code></div>
            <div style={styles.indicatorRow}>
              <TypingIndicator visible={isStreaming} variant={variant} />
            </div>
            <div style={{ ...styles.indicatorRow, color: '#7c3aed' }}>
              <TypingIndicator visible={isStreaming} variant={variant} aria-label={`${variant} in purple`} />
            </div>
          </div>
        ))}
      </div>

      {/* Live streaming example */}
      <div style={styles.liveBox}>
        <div style={styles.liveHeader}>
          <TypingIndicator visible={isStreaming} variant="dots" />
          {isStreaming && <span style={styles.liveLabel}>AI is typing…</span>}
        </div>
        {text && (
          <StreamingText content={text} isStreaming={isStreaming} cursor as="p" style={styles.liveText} />
        )}
      </div>

      {/* hasActiveToolCall pattern */}
      <div style={styles.toolBox}>
        <div style={styles.panelLabel}>hasActiveToolCall pattern</div>
        <div style={styles.toolInner}>
          <TypingIndicator
            visible={isStreaming}
            variant="bar"
            aria-label="Running tool…"
            style={{ color: '#f59e0b' }}
          />
          {isStreaming && <span style={styles.toolLabel}>Running web_search…</span>}
          {!isStreaming && <span style={styles.toolIdle}>Tool idle — start stream to simulate tool call</span>}
        </div>
      </div>

      <div style={styles.actions}>
        <button onClick={start} disabled={isStreaming} style={styles.btn}>
          {isStreaming ? 'Streaming…' : 'Start stream'}
        </button>
        <button onClick={() => { reset(); setSource(null) }} style={styles.resetBtn}>Reset</button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 16 },
  heading: { margin: '0 0 4px', fontSize: 18, fontWeight: 700 },
  desc: { margin: 0, color: '#4b5563', fontSize: 13, lineHeight: 1.6 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  variantCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  variantLabel: { fontSize: 13, fontWeight: 600, color: '#374151' },
  indicatorRow: { display: 'flex', alignItems: 'center', minHeight: 24 },
  liveBox: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 },
  liveHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  liveLabel: { fontSize: 13, color: '#6b7280' },
  liveText: { margin: 0, fontSize: 14, lineHeight: 1.7, color: '#111827' },
  toolBox: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' },
  panelLabel: { background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  toolInner: { padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 },
  toolLabel: { fontSize: 13, color: '#f59e0b', fontWeight: 600 },
  toolIdle: { fontSize: 12, color: '#9ca3af' },
  actions: { display: 'flex', gap: 8 },
  btn: { padding: '7px 18px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  resetBtn: { padding: '7px 14px', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' },
}
