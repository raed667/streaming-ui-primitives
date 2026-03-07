/**
 * StreamGuard Demo — all 4 lifecycle states.
 *
 * StreamGuard renders different React nodes for each StreamStatus:
 *  idle      → prompt to start
 *  streaming → live text with cursor + typing indicator
 *  complete  → final text + actions
 *  error     → error message + retry
 *
 * You can force the error state to test error handling.
 */
import React, { useState } from 'react'
import { useTokenStream, StreamGuard, StreamingText, TypingIndicator } from 'streaming-ui-primitives'
import { fromFetchSSE } from 'streaming-ui-primitives/adapters'

export function StreamGuardDemo() {
  const [source, setSource] = useState<AsyncIterable<string> | null>(null)
  const [forceError, setForceError] = useState(false)
  const { text, status, error, reset } = useTokenStream(source)

  async function start() {
    reset()
    setForceError(false)

    const endpoint = forceError ? '/api/error' : '/api/stream?mode=sse-text'
    const res = await fetch(endpoint, { method: 'POST' })

    if (!res.ok) {
      setSource(failingIterable(`HTTP ${res.status}: ${res.statusText}`))
      return
    }

    setSource(fromFetchSSE(res, { mode: 'sse-text' }))
  }

  function handleReset() {
    reset()
    setSource(null)
  }

  return (
    <div style={styles.root}>
      <h2 style={styles.heading}>StreamGuard — all 4 states</h2>
      <p style={styles.desc}>
        <code>StreamGuard</code> renders a different node for each <code>StreamStatus</code>.
        Toggle "Force error" to test the error slot.
      </p>

      {/* Status indicator */}
      <div style={styles.statusRow}>
        {(['idle', 'streaming', 'complete', 'error'] as const).map(s => (
          <span key={s} style={{ ...styles.statusPill, ...(status === s ? styles.statusActive : styles.statusInactive) }}>
            {s}
          </span>
        ))}
      </div>

      {/* The main StreamGuard */}
      <div style={styles.guardBox}>
        <StreamGuard
          status={status}
          idle={
            <div style={styles.slot}>
              <p style={styles.idleText}>Nothing streaming yet.</p>
              <p style={styles.hint}>Click <strong>Start</strong> below to begin.</p>
            </div>
          }
          streaming={
            <div style={styles.slot}>
              <div style={styles.streamingHeader}>
                <TypingIndicator visible variant="dots" />
                <span style={styles.streamingLabel}>Generating response…</span>
              </div>
              <StreamingText content={text} isStreaming cursor as="p" style={styles.streamText} />
            </div>
          }
          complete={
            <div style={styles.slot}>
              <p style={styles.completeTag}>Complete</p>
              <p style={styles.streamText}>{text}</p>
              <p style={styles.hint}>{text.length} characters received.</p>
            </div>
          }
          error={(err) => (
            <div style={styles.errorSlot}>
              <p style={styles.errorTag}>Error</p>
              <p style={styles.errorMessage}>{err?.message ?? 'An unknown error occurred'}</p>
              <button onClick={handleReset} style={styles.retryBtn}>Retry</button>
            </div>
          )}
          errorValue={error}
        />
      </div>

      <div style={styles.controls}>
        <label style={styles.errorToggle}>
          <input
            type="checkbox"
            checked={forceError}
            onChange={e => setForceError(e.target.checked)}
          />
          Force error state
        </label>
      </div>

      <div style={styles.actions}>
        <button onClick={start} disabled={status === 'streaming'} style={styles.startBtn}>
          Start
        </button>
        <button onClick={handleReset} style={styles.resetBtn}>Reset</button>
      </div>
    </div>
  )
}

async function* failingIterable(msg: string): AsyncIterable<string> {
  throw new Error(msg)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  yield ''
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 14 },
  heading: { margin: '0 0 4px', fontSize: 18, fontWeight: 700 },
  desc: { margin: 0, color: '#4b5563', fontSize: 13, lineHeight: 1.6 },
  statusRow: { display: 'flex', gap: 6 },
  statusPill: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  statusActive: { background: '#111827', color: '#fff' },
  statusInactive: { background: '#f3f4f6', color: '#9ca3af' },
  guardBox: { background: '#fff', border: '2px solid #e5e7eb', borderRadius: 12, minHeight: 120, overflow: 'hidden' },
  slot: { padding: '16px 20px' },
  idleText: { margin: '0 0 4px', fontSize: 15, color: '#374151', fontWeight: 500 },
  streamingHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  streamingLabel: { fontSize: 13, color: '#6b7280' },
  streamText: { margin: 0, fontSize: 15, lineHeight: 1.7, color: '#111827' },
  completeTag: { margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, letterSpacing: '0.07em' },
  errorSlot: { padding: '16px 20px', background: '#fef2f2' },
  errorTag: { margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.07em' },
  errorMessage: { margin: '0 0 10px', fontSize: 14, color: '#dc2626' },
  retryBtn: { padding: '4px 12px', background: '#fff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  hint: { margin: '4px 0 0', fontSize: 12, color: '#9ca3af' },
  controls: { display: 'flex', alignItems: 'center', gap: 10 },
  errorToggle: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' },
  actions: { display: 'flex', gap: 8 },
  startBtn: { padding: '7px 18px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  resetBtn: { padding: '7px 14px', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' },
}
