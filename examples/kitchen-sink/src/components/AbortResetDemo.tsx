/**
 * Abort vs Reset Demo.
 *
 * Shows the key difference:
 *  - abort()  stops the stream but PRESERVES accumulated text (status → idle)
 *  - reset()  stops the stream AND CLEARS text (status → idle)
 *
 * Also demonstrates useDebouncedStreaming to smooth rapid status transitions.
 */
import React, { useState } from 'react'
import { useTokenStream, useDebouncedStreaming, StreamingText } from '@raed667/streaming-ui-primitives'
import { fromFetchSSE } from '@raed667/streaming-ui-primitives/adapters'

export function AbortResetDemo() {
  const [source, setSource] = useState<AsyncIterable<string> | null>(null)
  const { text, status, abort, reset } = useTokenStream(source)
  const isStreaming = status === 'streaming'

  // Debounced version — compare raw vs stabilised
  const debouncedStreaming = useDebouncedStreaming(isStreaming, 150)

  async function start() {
    reset()
    const res = await fetch('/api/stream?mode=sse-text', { method: 'POST' })
    setSource(fromFetchSSE(res, { mode: 'sse-text' }))
  }

  function handleAbort() {
    abort()         // stops stream, text preserved
    setSource(null)
  }

  function handleReset() {
    reset()         // stops stream, text cleared
    setSource(null)
  }

  return (
    <div style={styles.root}>
      <h2 style={styles.heading}>abort() vs reset()</h2>

      <div style={styles.comparison}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>abort()</div>
          <p style={styles.cardDesc}>
            Stops the in-progress stream. <strong>Preserves</strong> whatever text has accumulated
            so far. Status becomes <code>'idle'</code>.
          </p>
          <div style={styles.useCase}>Use when: user presses "Stop" but wants to see partial response.</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardHeader}>reset()</div>
          <p style={styles.cardDesc}>
            Stops the in-progress stream AND <strong>clears</strong> all text. Status becomes <code>'idle'</code>.
          </p>
          <div style={styles.useCase}>Use when: user wants to start fresh or discard the response.</div>
        </div>
      </div>

      {/* Live output */}
      <div style={styles.outputBox}>
        <div style={styles.outputHeader}>
          <span>Live output</span>
          <div style={styles.statusBadges}>
            <span style={{ ...styles.badge, ...(isStreaming ? styles.badgeActive : styles.badgeInactive) }}>
              raw: {isStreaming ? 'streaming' : 'idle'}
            </span>
            <span style={{ ...styles.badge, ...(debouncedStreaming ? styles.badgeActive : styles.badgeInactive) }}>
              debounced: {debouncedStreaming ? 'streaming' : 'idle'}
            </span>
            <span style={{ ...styles.badge, ...statusColor(status) }}>
              status: {status}
            </span>
          </div>
        </div>
        <div style={styles.outputContent}>
          {text ? (
            <StreamingText
              content={text}
              isStreaming={isStreaming}
              cursor
              as="p"
              style={styles.outputText}
            />
          ) : (
            <p style={styles.outputIdle}>Text appears here during streaming.</p>
          )}
        </div>
      </div>

      <div style={styles.actions}>
        <button onClick={start} disabled={isStreaming} style={styles.startBtn}>
          {isStreaming ? 'Streaming…' : 'Start stream'}
        </button>
        <button onClick={handleAbort} disabled={!isStreaming} style={styles.abortBtn}>
          abort() — stop, keep text
        </button>
        <button onClick={handleReset} style={styles.resetBtn}>
          reset() — stop, clear text
        </button>
      </div>
    </div>
  )
}

function statusColor(s: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    idle: { background: '#f3f4f6', color: '#6b7280' },
    streaming: { background: '#dbeafe', color: '#1e40af' },
    complete: { background: '#d1fae5', color: '#065f46' },
    error: { background: '#fee2e2', color: '#991b1b' },
  }
  return map[s] ?? map['idle']!
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 16 },
  heading: { margin: '0 0 4px', fontSize: 18, fontWeight: 700 },
  comparison: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 },
  cardHeader: { fontSize: 14, fontWeight: 700, fontFamily: 'ui-monospace, monospace', marginBottom: 6, color: '#111827' },
  cardDesc: { margin: '0 0 8px', fontSize: 13, color: '#374151', lineHeight: 1.5 },
  useCase: { fontSize: 12, color: '#6b7280', fontStyle: 'italic' },
  outputBox: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' },
  outputHeader: { background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 6, fontSize: 12, fontWeight: 600, color: '#374151' },
  statusBadges: { display: 'flex', gap: 4, flexWrap: 'wrap' as const },
  badge: { padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  badgeActive: { background: '#dbeafe', color: '#1e40af' },
  badgeInactive: { background: '#f3f4f6', color: '#9ca3af' },
  outputContent: { padding: '12px 14px', minHeight: 80 },
  outputText: { margin: 0, fontSize: 14, lineHeight: 1.7, color: '#111827' },
  outputIdle: { margin: 0, color: '#9ca3af', fontSize: 14 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
  startBtn: { padding: '7px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  abortBtn: { padding: '7px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  resetBtn: { padding: '7px 16px', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
}
