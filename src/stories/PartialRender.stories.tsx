import type { Meta, StoryObj } from '@storybook/react'
import React, { useEffect, useRef, useState } from 'react'
import { PartialRender } from '../components/PartialRender'

const plainTextRenderer = (content: string) => (
  <p style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 }}>{content}</p>
)

const meta: Meta<typeof PartialRender> = {
  title: 'Primitives/PartialRender',
  component: PartialRender,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Gracefully renders partial/incomplete content during streaming. ' +
          'Wraps the renderer in an error boundary to catch parse errors mid-stream ' +
          '(e.g. markdown parsers choking on incomplete syntax) and falls back to plain text. ' +
          'Renderer-agnostic — pass any `(content: string, isComplete: boolean) => ReactNode` function.',
      },
    },
  },
  argTypes: {
    content: { control: 'text' },
    isComplete: { control: 'boolean' },
    renderer: { control: false },
    errorFallback: { control: false },
    fallback: { control: false },
    onRenderError: { control: false },
  },
  args: {
    renderer: plainTextRenderer,
    content: '',
  },
}
export default meta

type Story = StoryObj<typeof PartialRender>

export const PlainText: Story = {
  args: {
    content: 'This is a completed plain text response from the model.',
    isComplete: true,
    renderer: plainTextRenderer,
  },
}

export const Empty: Story = {
  args: {
    content: '',
    isComplete: false,
    renderer: plainTextRenderer,
    fallback: (
      <span style={{ color: '#9ca3af', fontFamily: 'sans-serif' }}>Waiting for first token…</span>
    ),
  },
}

export const ErrorBoundaryFallback: Story = {
  args: {
    content: 'some content that causes a renderer error',
    isComplete: false,
    renderer: () => {
      throw new Error('Simulated parse error')
    },
    errorFallback: (
      <span style={{ color: '#ef4444', fontFamily: 'sans-serif', fontStyle: 'italic' }}>
        Render failed — showing raw text instead.
      </span>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'When the renderer throws (e.g. a markdown parser choking on partial input), ' +
          'the error boundary catches it and shows `errorFallback` or raw text.',
      },
    },
  },
}

// ── Markdown streaming demo ──────────────────────────────────────────────────

const FULL_MARKDOWN = `# AI Response

Here is a **streaming** markdown response with:

- A list item
- Another item with \`inline code\`

\`\`\`ts
const greeting = 'hello world'
\`\`\`

> A blockquote to finish.`

function markdownRenderer(content: string) {
  // Minimal renderer — just applies some styling to demonstrate
  // the concept without pulling in a full markdown parser
  const html = content
    .replace(/^# (.+)$/m, '<h1 style="margin:0 0 8px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /`([^`]+)`/g,
      '<code style="background:#f3f4f6;padding:1px 4px;border-radius:3px">$1</code>',
    )
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(
      /^> (.+)$/gm,
      '<blockquote style="border-left:3px solid #e5e7eb;margin:0;padding-left:12px;color:#6b7280">$1</blockquote>',
    )

  return (
    <div
      style={{ fontFamily: 'sans-serif', lineHeight: 1.6, fontSize: 14 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function StreamingMarkdownDemo() {
  const [content, setContent] = useState('')
  const [running, setRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const indexRef = useRef(0)

  function start() {
    setContent('')
    setIsComplete(false)
    setRunning(true)
    indexRef.current = 0
  }

  useEffect(() => {
    if (!running) return
    if (indexRef.current >= FULL_MARKDOWN.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRunning(false)
      setIsComplete(true)
      return
    }
    const chunkSize = Math.floor(Math.random() * 6) + 1
    const t = setTimeout(() => {
      setContent(FULL_MARKDOWN.slice(0, indexRef.current + chunkSize))
      indexRef.current += chunkSize
    }, 30)
    return () => clearTimeout(t)
  }, [running, content])

  return (
    <div style={{ width: 480 }}>
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 16,
          minHeight: 120,
          background: '#fafafa',
        }}
      >
        <PartialRender
          content={content}
          isComplete={isComplete}
          renderer={markdownRenderer}
          fallback={
            <span style={{ color: '#9ca3af', fontFamily: 'sans-serif' }}>
              Press "Stream" to start…
            </span>
          }
        />
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={start}
          disabled={running}
          style={{ padding: '6px 16px', cursor: running ? 'default' : 'pointer' }}
        >
          {running ? 'Streaming…' : 'Stream'}
        </button>
        {isComplete && (
          <span style={{ fontSize: 12, color: '#10b981', fontFamily: 'sans-serif' }}>Complete</span>
        )}
      </div>
    </div>
  )
}

export const StreamingMarkdown: Story = {
  render: () => <StreamingMarkdownDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Streaming partial markdown — the renderer receives incomplete input on every token. ' +
          'Pass `isComplete` to let the renderer know when it can do a final parse pass.',
      },
    },
  },
}

// ── onRenderError callback demo ───────────────────────────────────────────────

function OnRenderErrorDemo() {
  const [errorLog, setErrorLog] = useState<string[]>([])

  return (
    <div style={{ fontFamily: 'sans-serif', width: 480 }}>
      <PartialRender
        content="content that will always fail to render"
        isComplete={false}
        renderer={() => {
          throw new Error('Simulated parse error')
        }}
        errorFallback={(_err, raw) => (
          <span style={{ color: '#6b7280', fontStyle: 'italic' }}>{raw}</span>
        )}
        onRenderError={(err, content) => {
          setErrorLog((prev) => [
            ...prev.slice(-4),
            `[${new Date().toLocaleTimeString()}] ${err.message} (content: "${content.slice(0, 20)}…")`,
          ])
        }}
      />

      <div
        style={{
          marginTop: 16,
          background: '#1e1e2e',
          borderRadius: 8,
          padding: '10px 14px',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 12,
          color: '#cdd6f4',
        }}
      >
        <div style={{ color: '#585b70', marginBottom: 6 }}>// onRenderError log</div>
        {errorLog.length === 0 ? (
          <span style={{ color: '#585b70' }}>No errors yet (renders once on mount)</span>
        ) : (
          errorLog.map((entry, i) => <div key={i}>{entry}</div>)
        )}
      </div>
    </div>
  )
}

export const OnRenderErrorCallback: Story = {
  render: () => <OnRenderErrorDemo />,
  parameters: {
    docs: {
      description: {
        story:
          '`onRenderError` fires whenever the error boundary catches a renderer throw. ' +
          'Use it to log errors to your observability stack without disrupting the UI.',
      },
    },
  },
}
