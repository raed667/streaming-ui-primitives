import type { Meta, StoryObj } from '@storybook/react'
import React, { useRef, useState } from 'react'
import { useTokenStream } from '../hooks/useTokenStream'
import { StreamingText } from '../components/StreamingText'
import { TypingIndicator } from '../components/TypingIndicator'
import { StreamGuard } from '../components/StreamGuard'

const meta: Meta = {
  title: 'Hooks/useTokenStream',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`useTokenStream` is the core hook. It accepts any `AsyncIterable<string>` or ' +
          '`ReadableStream<Uint8Array>` and returns `{ text, tokenCount, isStreaming, status, error, abort, reset }`. ' +
          'Accepts an optional `options` bag with `onToken`, `onComplete`, and `onError` callbacks. ' +
          'This story demonstrates it with a simulated async generator.',
      },
    },
  },
}
export default meta
type Story = StoryObj

const TOKENS = `The quick brown fox jumps over the lazy dog.
Streaming is the future of AI-native UIs.
Each token arrives one at a time.`.split(' ')

async function* simulateStream(delayMs: number): AsyncIterable<string> {
  for (const token of TOKENS) {
    await new Promise(r => setTimeout(r, delayMs))
    yield token + ' '
  }
}

function TokenStreamDemo({ speed = 80 }: { speed?: number }) {
  const [source, setSource] = useState<AsyncIterable<string> | null>(null)
  const { text, tokenCount, status, error, reset } = useTokenStream(source)

  function start() {
    reset()
    setSource(simulateStream(speed))
  }

  return (
    <div style={{ fontFamily: 'sans-serif', width: 400 }}>
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 16,
          minHeight: 80,
          background: '#fafafa',
          marginBottom: 12,
        }}
      >
        <StreamGuard
          status={status}
          idle={<span style={{ color: '#9ca3af' }}>Press Start to stream…</span>}
          streaming={
            <span>
              <StreamingText content={text} isStreaming cursor as="span" />
              {text === '' && <TypingIndicator visible />}
            </span>
          }
          complete={
            <StreamingText content={text} isStreaming={false} cursor={false} as="span" />
          }
          error={err => (
            <span style={{ color: '#ef4444' }}>Error: {err?.message}</span>
          )}
          errorValue={error}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={start}
          disabled={status === 'streaming'}
          style={{ padding: '6px 16px', cursor: status === 'streaming' ? 'default' : 'pointer' }}
        >
          {status === 'streaming' ? 'Streaming…' : 'Start'}
        </button>
        <button
          onClick={() => { reset(); setSource(null) }}
          style={{ padding: '6px 16px', cursor: 'pointer' }}
        >
          Reset
        </button>
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          status: <strong>{status}</strong>
          {tokenCount > 0 && ` · ${tokenCount} tokens · ${text.length} chars`}
        </span>
      </div>
    </div>
  )
}

export const Default: Story = {
  render: () => <TokenStreamDemo speed={80} />,
}

export const FastStream: Story = {
  render: () => <TokenStreamDemo speed={20} />,
  parameters: { docs: { description: { story: '20ms per token — near-instant streaming.' } } },
}

export const SlowStream: Story = {
  render: () => <TokenStreamDemo speed={300} />,
  parameters: { docs: { description: { story: '300ms per token — clearly visible gaps between tokens.' } } },
}

// Error simulation
async function* failingStream(): AsyncIterable<string> {
  yield 'Starting… '
  yield 'Got some data… '
  await new Promise(r => setTimeout(r, 300))
  throw new Error('Connection dropped at token 3')
}

function ErrorDemo() {
  const [source, setSource] = useState<AsyncIterable<string> | null>(null)
  const { text, status, error, reset } = useTokenStream(source)

  return (
    <div style={{ fontFamily: 'sans-serif', width: 400 }}>
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 16,
          minHeight: 60,
          background: '#fafafa',
          marginBottom: 12,
        }}
      >
        <StreamGuard
          status={status}
          idle={<span style={{ color: '#9ca3af' }}>Press Start to watch the error…</span>}
          streaming={<StreamingText content={text} isStreaming cursor as="span" />}
          complete={<StreamingText content={text} isStreaming={false} as="span" />}
          error={err => (
            <span style={{ color: '#ef4444' }}>
              Error caught: {err?.message}
            </span>
          )}
          errorValue={error}
        />
      </div>
      <button
        onClick={() => { reset(); setSource(failingStream()) }}
        disabled={status === 'streaming'}
        style={{ padding: '6px 16px', cursor: 'pointer', marginRight: 8 }}
      >
        Start
      </button>
      <button onClick={() => { reset(); setSource(null) }} style={{ padding: '6px 16px', cursor: 'pointer' }}>
        Reset
      </button>
    </div>
  )
}

export const ErrorHandling: Story = {
  render: () => <ErrorDemo />,
  parameters: {
    docs: {
      description: {
        story: 'The stream throws mid-way. `status` transitions to `error` and `error` holds the thrown value.',
      },
    },
  },
}

// ---------------------------------------------------------------------------
// Callbacks demo — onToken / onComplete / onError
// ---------------------------------------------------------------------------

function CallbacksDemo() {
  const [source, setSource] = useState<AsyncIterable<string> | null>(null)
  const [log, setLog] = useState<string[]>([])

  const { text, tokenCount, status, reset } = useTokenStream(source, {
    onToken: (token) => setLog(prev => [...prev, `onToken("${token.trim()}")`]),
    onComplete: (fullText) => setLog(prev => [...prev, `onComplete(${fullText.length} chars)`]),
    onError: (err) => setLog(prev => [...prev, `onError("${err.message}")`]),
  })

  function start() {
    setLog([])
    reset()
    setSource(simulateStream(100))
  }

  return (
    <div style={{ fontFamily: 'sans-serif', width: 480 }}>
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 16,
          minHeight: 60,
          background: '#fafafa',
          marginBottom: 12,
          fontSize: 14,
          color: '#111827',
        }}
      >
        {text || <span style={{ color: '#9ca3af' }}>Press Start…</span>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={start}
          disabled={status === 'streaming'}
          style={{ padding: '6px 16px', cursor: status === 'streaming' ? 'default' : 'pointer' }}
        >
          {status === 'streaming' ? `Streaming… (${tokenCount})` : 'Start'}
        </button>
        <button onClick={() => { setLog([]); reset(); setSource(null) }} style={{ padding: '6px 16px', cursor: 'pointer' }}>
          Reset
        </button>
      </div>

      <div
        style={{
          background: '#1e1e2e',
          borderRadius: 8,
          padding: '10px 14px',
          maxHeight: 200,
          overflowY: 'auto',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 12,
          color: '#cdd6f4',
        }}
      >
        {log.length === 0
          ? <span style={{ color: '#585b70' }}>// callbacks will appear here</span>
          : log.map((entry, i) => <div key={i}>{entry}</div>)
        }
      </div>
    </div>
  )
}

export const Callbacks: Story = {
  render: () => <CallbacksDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'The optional `options` bag accepts `onToken`, `onComplete`, and `onError`. ' +
          'Each fires at the appropriate lifecycle moment. Callbacks always use the latest reference ' +
          'via an internal ref — no stale closure risk.',
      },
    },
  },
}
