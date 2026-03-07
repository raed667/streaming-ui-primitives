import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import { StreamGuard } from '../components/StreamGuard'
import { TypingIndicator } from '../components/TypingIndicator'
import { StreamingText } from '../components/StreamingText'
import type { StreamStatus } from '../types'

const meta: Meta<typeof StreamGuard> = {
  title: 'Primitives/StreamGuard',
  component: StreamGuard,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['idle', 'submitted', 'streaming', 'complete', 'error'],
    },
  },
}
export default meta

type Story = StoryObj<typeof StreamGuard>

export const Idle: Story = {
  args: {
    status: 'idle',
    idle: <p style={{ color: '#666', fontFamily: 'sans-serif' }}>Ask me anything…</p>,
    streaming: <TypingIndicator visible />,
    complete: <p style={{ fontFamily: 'sans-serif' }}>Done!</p>,
  },
}

export const Submitted: Story = {
  args: {
    status: 'submitted',
    idle: <p style={{ color: '#666', fontFamily: 'sans-serif' }}>Ask me anything…</p>,
    submitted: (
      <p style={{ color: '#6b7280', fontFamily: 'sans-serif', fontStyle: 'italic' }}>
        Request sent — waiting for first token…
      </p>
    ),
    streaming: <TypingIndicator visible />,
    complete: <p style={{ fontFamily: 'sans-serif' }}>Done!</p>,
  },
}

export const Streaming: Story = {
  args: {
    status: 'streaming',
    idle: <p style={{ color: '#666', fontFamily: 'sans-serif' }}>Ask me anything…</p>,
    streaming: <TypingIndicator visible />,
    complete: <p style={{ fontFamily: 'sans-serif' }}>Done!</p>,
  },
}

export const Complete: Story = {
  args: {
    status: 'complete',
    idle: <p style={{ color: '#666', fontFamily: 'sans-serif' }}>Ask me anything…</p>,
    streaming: <TypingIndicator visible />,
    complete: (
      <StreamingText
        content="The answer is 42. Streaming is now complete."
        isStreaming={false}
        cursor={false}
        as="p"
        style={{ fontFamily: 'sans-serif' }}
      />
    ),
  },
}

export const ErrorState: Story = {
  name: 'Error',
  args: {
    status: 'error',
    error: (err: Error | null) => (
      <p style={{ color: '#ef4444', fontFamily: 'sans-serif' }}>
        Error: {err?.message ?? 'Something went wrong'}
      </p>
    ),
    errorValue: new Error('Connection timed out'),
  },
}

const STATUSES: StreamStatus[] = ['idle', 'submitted', 'streaming', 'complete', 'error']

function LifecycleDemo() {
  const [status, setStatus] = useState<StreamStatus>('idle')
  const [text, setText] = useState('')

  function simulate() {
    setStatus('streaming')
    setText('')
    const tokens = 'The simulation is complete. '.split(' ')
    let i = 0
    const tick = () => {
      if (i >= tokens.length) {
        setStatus('complete')
        return
      }
      setText(prev => prev + (tokens[i] ?? '') + ' ')
      i++
      setTimeout(tick, 150)
    }
    setTimeout(tick, 300)
  }

  return (
    <div style={{ fontFamily: 'sans-serif', width: 360 }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            style={{
              padding: '4px 10px',
              background: status === s ? '#3b82f6' : '#f3f4f6',
              color: status === s ? '#fff' : '#374151',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 16,
          minHeight: 60,
        }}
      >
        <StreamGuard
          status={status}
          idle={<span style={{ color: '#9ca3af' }}>Start a conversation…</span>}
          submitted={<span style={{ color: '#6b7280', fontStyle: 'italic' }}>Request sent…</span>}
          streaming={<TypingIndicator visible />}
          complete={<StreamingText content={text} isStreaming={false} as="span" />}
          error={err => <span style={{ color: '#ef4444' }}>Error: {err?.message}</span>}
          errorValue={new Error('Demo error')}
        />
      </div>
      <button
        onClick={simulate}
        style={{ marginTop: 12, padding: '6px 14px', cursor: 'pointer' }}
      >
        Run simulation
      </button>
    </div>
  )
}

export const LifecycleSimulation: Story = {
  render: () => <LifecycleDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Click the status buttons to jump between states, or Run simulation to watch the full lifecycle.',
      },
    },
  },
}
