import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import { StreamGuard } from '../components/StreamGuard'
import { TypingIndicator } from '../components/TypingIndicator'
import { StreamingText } from '../components/StreamingText'
import { PartialRender } from '../components/PartialRender'
import { fromUseChatStatus } from '../types'
import { useMessageStream } from '../hooks/useMessageStream'
import type { UIMessagePartCompat, UseChatStatus } from '../types'

const meta: Meta = {
  title: 'Integrations/Vercel AI SDK',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Demonstrates how to integrate `streaming-ui-primitives` with the Vercel AI SDK `useChat` hook. ' +
          'Uses `fromUseChatStatus()` to map `useChat` status values to `StreamStatus`, and ' +
          '`useMessageStream()` to extract text from `UIMessage.parts`.',
      },
    },
  },
}
export default meta
type Story = StoryObj

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SimulatedStatus = 'idle' | 'submitted' | 'streaming' | 'ready' | 'error'

interface SimulatedMessage {
  id: string
  role: 'user' | 'assistant'
  parts: UIMessagePartCompat[]
}

// ---------------------------------------------------------------------------
// Tokens for simulation
// ---------------------------------------------------------------------------

const RESPONSE_TOKENS = [
  'Hello! ',
  'I am ',
  'streaming ',
  'a response ',
  'token ',
  'by ',
  'token. ',
  'This demonstrates ',
  'the full ',
  'Vercel AI SDK ',
  'useChat ',
  'integration.',
]

// ---------------------------------------------------------------------------
// UseChatSimulation component
// ---------------------------------------------------------------------------

function UseChatSimulation() {
  const [chatStatus, setChatStatus] = useState<SimulatedStatus>('idle')
  const [messages, setMessages] = useState<SimulatedMessage[]>([])

  // Derive the StreamStatus from the simulated useChat status.
  // 'idle' is not a UseChatStatus so we handle it separately.
  const streamStatus =
    chatStatus === 'idle'
      ? 'idle'
      : fromUseChatStatus(chatStatus as UseChatStatus)

  const lastMsg = messages[messages.length - 1]
  const assistantMsg =
    lastMsg?.role === 'assistant' ? lastMsg : undefined
  const { text } = useMessageStream(assistantMsg?.parts ?? [])

  function sendMessage() {
    if (chatStatus !== 'idle' && chatStatus !== 'ready') return

    // Reset to a fresh simulation
    setMessages([{ id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'Hello!' }] }])
    setChatStatus('submitted')

    // Step 1: transition to streaming after a short delay
    setTimeout(() => {
      setChatStatus('streaming')
      const assistantId = 'assistant-1'

      // Add the assistant message with an empty parts array
      setMessages(prev => [
        ...prev.filter(m => m.id !== assistantId),
        { id: assistantId, role: 'assistant', parts: [] },
      ])

      // Step 2: stream tokens one by one
      let tokenIndex = 0
      let accumulated = ''

      const streamToken = () => {
        if (tokenIndex >= RESPONSE_TOKENS.length) {
          // All tokens delivered — mark ready
          setChatStatus('ready')
          return
        }

        accumulated += RESPONSE_TOKENS[tokenIndex] ?? ''
        tokenIndex++

        const snapshot = accumulated
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, parts: [{ type: 'text', text: snapshot }] }
              : m,
          ),
        )

        setTimeout(streamToken, 120)
      }

      setTimeout(streamToken, 0)
    }, 300)
  }

  return (
    <div
      data-status={streamStatus}
      style={{ fontFamily: 'sans-serif', width: 420, maxWidth: '100%' }}
    >
      {/* Status badge */}
      <div style={{ marginBottom: 10, fontSize: 12, color: '#6b7280' }}>
        useChat status:{' '}
        <strong style={{ color: '#111827' }}>{chatStatus}</strong>
        {' · '}
        StreamStatus:{' '}
        <strong style={{ color: '#3b82f6' }}>{streamStatus}</strong>
      </div>

      {/* Chat bubble area */}
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
          status={streamStatus}
          idle={
            <span style={{ color: '#9ca3af' }}>
              Press &ldquo;Send message&rdquo; to start the simulation…
            </span>
          }
          streaming={
            <div>
              {text === '' ? (
                <TypingIndicator visible />
              ) : (
                <StreamingText content={text} isStreaming cursor as="p" style={{ margin: 0 }} />
              )}
            </div>
          }
          complete={
            <PartialRender
              content={text}
              isComplete
              renderer={(content) => (
                <StreamingText
                  content={content}
                  isStreaming={false}
                  cursor={false}
                  as="p"
                  style={{ margin: 0 }}
                />
              )}
            />
          }
          error={err => (
            <span style={{ color: '#ef4444' }}>
              Error: {err?.message ?? 'Something went wrong'}
            </span>
          )}
        />
      </div>

      {/* Controls */}
      <button
        onClick={sendMessage}
        disabled={chatStatus === 'submitted' || chatStatus === 'streaming'}
        style={{
          padding: '6px 16px',
          cursor:
            chatStatus === 'submitted' || chatStatus === 'streaming'
              ? 'default'
              : 'pointer',
          opacity:
            chatStatus === 'submitted' || chatStatus === 'streaming' ? 0.5 : 1,
        }}
      >
        {chatStatus === 'submitted'
          ? 'Submitting…'
          : chatStatus === 'streaming'
            ? 'Streaming…'
            : 'Send message'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Default: Story = {
  render: () => <UseChatSimulation />,
  parameters: {
    docs: {
      description: {
        story:
          'Click "Send message" to watch the full `useChat` lifecycle: ' +
          '`idle` → `submitted` → `streaming` (token by token) → `ready` (complete). ' +
          '`fromUseChatStatus()` maps each value to the matching `StreamStatus`.',
      },
    },
  },
}
