/**
 * Raw fetch SSE example.
 *
 * Demonstrates all four fromFetchSSE() modes:
 *  - 'auto'      — sniffs Content-Type, picks plain text or SSE automatically
 *  - 'sse-text'  — SSE with plain text in data: fields
 *  - 'vercel-ai' — Vercel AI SDK data stream protocol (0:"token" lines)
 *  - 'sse-json'  — SSE with JSON objects, dot-path extraction
 *
 * Also demonstrates:
 *  - reset()     — cancel stream AND clear accumulated text
 *  - StreamGuard — status-driven slots
 */
import React, { useState } from 'react'
import { ModeDemo } from './components/ModeDemo'
import type { FetchSSEMode } from '@raed667/streaming-ui-primitives/adapters'

const MODES: { mode: FetchSSEMode; label: string; description: string }[] = [
  {
    mode: 'auto',
    label: 'auto',
    description: 'Sniffs Content-Type: plain text → yield chunk as-is; text/event-stream → parse SSE data: lines',
  },
  {
    mode: 'sse-text',
    label: 'sse-text',
    description: 'SSE stream where each data: line contains plain text (Vercel AI SDK streamText, etc.)',
  },
  {
    mode: 'vercel-ai',
    label: 'vercel-ai',
    description: 'Vercel AI SDK data stream protocol — bare lines prefixed 0:"token" (not wrapped in data:)',
  },
  {
    mode: 'sse-json',
    label: 'sse-json',
    description: 'SSE with JSON objects; extracts choices[0].delta.content via dot-path (OpenAI-compatible)',
  },
]

export function App() {
  const [activeMode, setActiveMode] = useState<FetchSSEMode>('auto')
  const current = MODES.find(m => m.mode === activeMode)!

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <h1 style={styles.title}>Raw fetch SSE — fromFetchSSE()</h1>
        <p style={styles.subtitle}>
          Select a mode to see how <code>fromFetchSSE</code> handles different stream formats.
          No AI SDK required.
        </p>
      </div>

      {/* Mode tabs */}
      <div style={styles.tabs}>
        {MODES.map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => setActiveMode(mode)}
            style={{ ...styles.tab, ...(activeMode === mode ? styles.tabActive : {}) }}
          >
            <code>{label}</code>
          </button>
        ))}
      </div>

      {/* Mode description */}
      <p style={styles.modeDesc}>{current.description}</p>

      {/* Demo for selected mode */}
      <ModeDemo key={activeMode} mode={activeMode} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: { maxWidth: 680, margin: '0 auto', padding: '24px 16px' },
  header: { marginBottom: 20 },
  title: { margin: '0 0 4px', fontSize: 22, fontWeight: 700 },
  subtitle: { margin: 0, color: '#6b7280', fontSize: 14 },
  tabs: { display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' as const },
  tab: { padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' },
  tabActive: { background: '#1d4ed8', color: '#fff', borderColor: '#1d4ed8' },
  modeDesc: { margin: '0 0 16px', color: '#4b5563', fontSize: 13, lineHeight: 1.5 },
}
