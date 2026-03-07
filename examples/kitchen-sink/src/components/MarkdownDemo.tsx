/**
 * Markdown Demo — PartialRender + marked.
 *
 * PartialRender wraps the renderer in an error boundary so that if `marked`
 * throws on incomplete markdown (e.g. unclosed code fence mid-stream),
 * it gracefully falls back to plain text rather than crashing.
 *
 * Also shows a custom cursor: cursor={<span>▋</span>}
 */
import React, { useState } from 'react'
import { useTokenStream, PartialRender, StreamingText } from 'streaming-ui-primitives'
import { fromFetchSSE } from 'streaming-ui-primitives/adapters'
import { marked } from 'marked'

export function MarkdownDemo() {
  const [source, setSource] = useState<AsyncIterable<string> | null>(null)
  const { text, status, reset } = useTokenStream(source)

  async function start() {
    reset()
    const res = await fetch('/api/markdown', { method: 'POST' })
    setSource(fromFetchSSE(res, { mode: 'sse-json', jsonPath: 'text' }))
  }

  return (
    <div style={styles.root}>
      <h2 style={styles.heading}>PartialRender + marked</h2>
      <p style={styles.desc}>
        Markdown is parsed and rendered in real time. The error boundary in{' '}
        <code>PartialRender</code> catches any parse errors on incomplete chunks and falls back
        to plain text until the markdown is valid again.
      </p>

      <div style={styles.split}>
        {/* Raw text with custom cursor */}
        <div style={styles.panel}>
          <div style={styles.panelLabel}>Raw tokens (custom ▋ cursor)</div>
          <div style={styles.rawOutput}>
            <StreamingText
              content={text}
              isStreaming={status === 'streaming'}
              cursor={<span style={{ color: '#3b82f6' }}>▋</span>}
              as="pre"
              style={styles.pre}
            />
          </div>
        </div>

        {/* Rendered markdown */}
        <div style={styles.panel}>
          <div style={styles.panelLabel}>Rendered markdown</div>
          <div style={styles.renderedOutput}>
            <PartialRender
              content={text}
              isComplete={status === 'complete'}
              renderer={(content) => (
                <div
                  className="markdown-output"
                  dangerouslySetInnerHTML={{ __html: marked(content) as string }}
                />
              )}
              fallback={<span style={{ color: '#9ca3af' }}>Waiting for content…</span>}
              errorFallback={(_, content) => <pre style={styles.pre}>{content}</pre>}
            />
          </div>
        </div>
      </div>

      <div style={styles.actions}>
        <button
          onClick={start}
          disabled={status === 'streaming'}
          style={styles.btn}
        >
          {status === 'streaming' ? 'Streaming…' : 'Stream markdown'}
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
  split: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' },
  panelLabel: { background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' },
  rawOutput: { padding: 12, minHeight: 120 },
  renderedOutput: { padding: 12, minHeight: 120, fontSize: 14, lineHeight: 1.6 },
  pre: { margin: 0, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace', color: '#374151' },
  actions: { display: 'flex', gap: 8 },
  btn: { padding: '7px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  resetBtn: { padding: '7px 14px', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' },
}
