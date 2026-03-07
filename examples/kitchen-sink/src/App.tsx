/**
 * Kitchen Sink — every streaming-ui-primitives pattern in one app.
 *
 * Tabs:
 *  1. Markdown    — PartialRender + marked, graceful error boundary during streaming
 *  2. Cursors     — StreamingText cursor variants (default, custom, none)
 *  3. Indicators  — TypingIndicator dots / pulse / bar variants
 *  4. Abort/Reset — abort() preserves text vs reset() clears text
 *  5. Debounce    — useDebouncedStreaming before/after comparison
 *  6. Reasoning   — useMessageStream reasoning + sourceUrls
 *  7. StreamGuard — all 4 states (idle, streaming, complete, error)
 */
import React, { useState } from 'react'
import { MarkdownDemo } from './components/MarkdownDemo'
import { AbortResetDemo } from './components/AbortResetDemo'
import { TypingIndicatorDemo } from './components/TypingIndicatorDemo'
import { ReasoningDemo } from './components/ReasoningDemo'
import { StreamGuardDemo } from './components/StreamGuardDemo'

const TABS = [
  { id: 'markdown', label: 'Markdown' },
  { id: 'indicators', label: 'TypingIndicator' },
  { id: 'abort-reset', label: 'Abort / Reset' },
  { id: 'reasoning', label: 'Reasoning' },
  { id: 'streamguard', label: 'StreamGuard' },
] as const

type TabId = typeof TABS[number]['id']

export function App() {
  const [tab, setTab] = useState<TabId>('markdown')

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <h1 style={styles.title}>Kitchen Sink</h1>
        <p style={styles.subtitle}>
          Every pattern in <code>streaming-ui-primitives</code> — one tab at a time.
        </p>
      </div>

      <div style={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {tab === 'markdown' && <MarkdownDemo />}
        {tab === 'indicators' && <TypingIndicatorDemo />}
        {tab === 'abort-reset' && <AbortResetDemo />}
        {tab === 'reasoning' && <ReasoningDemo />}
        {tab === 'streamguard' && <StreamGuardDemo />}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: { maxWidth: 720, margin: '0 auto', padding: '24px 16px' },
  header: { marginBottom: 20 },
  title: { margin: '0 0 4px', fontSize: 24, fontWeight: 700 },
  subtitle: { margin: 0, color: '#6b7280', fontSize: 14 },
  tabs: { display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' as const },
  tab: { padding: '7px 16px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 500 },
  tabActive: { background: '#111827', color: '#fff', borderColor: '#111827' },
  content: { minHeight: 300 },
}
