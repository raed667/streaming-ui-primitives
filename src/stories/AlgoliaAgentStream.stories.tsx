import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import { useTokenStream } from '../hooks/useTokenStream'
import { StreamingText } from '../components/StreamingText'
import { TypingIndicator } from '../components/TypingIndicator'

import { fetchAlgoliaAgentStream } from '../adapters/fromAlgoliaAgentStream'

// ---------------------------------------------------------------------------
// Algolia Agent Studio credentials (demo app)
// ---------------------------------------------------------------------------

const APP_ID = '5UKN4DTFW7'
const API_KEY = '40010648cf8774576577dbdbeb386150'
const AGENT_ID = '82136f68-1a65-4c34-81e2-8359adbe446c'

interface DemoProps {
  cache: boolean
}

const meta: Meta<DemoProps> = {
  title: 'Integrations/Algolia Agent Studio',
  tags: ['autodocs'],
  argTypes: {
    cache: {
      control: 'boolean',
      description: 'Pass `cache=true/false` as a query parameter to the completions endpoint',
      table: { defaultValue: { summary: 'true' } },
    },
  },
  args: { cache: true },
  parameters: {
    docs: {
      description: {
        component:
          '`fetchAlgoliaAgentStream` calls the Algolia Agent Studio completions endpoint ' +
          'with `compatibilityMode=ai-sdk-5` and streams tokens via the Vercel AI SDK v5 ' +
          'data stream protocol. The result is a plain `AsyncIterable<string>` that feeds ' +
          'directly into `useTokenStream`.',
      },
    },
  },
}
export default meta
type Story = StoryObj<DemoProps>

// ---------------------------------------------------------------------------
// Demo component
// ---------------------------------------------------------------------------

const STARTER_QUESTIONS = [
  'What products do you have available?',
  'Show me some clothing options under $50',
  "I'm looking for shoes, what do you recommend?",
]

function AlgoliaAgentDemo({ cache }: DemoProps) {
  const [input, setInput] = useState('')
  const [source, setSource] = useState<AsyncIterable<string> | null>(null)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([])
  const { text, status, error, reset } = useTokenStream(source, {
    onComplete: (fullText) => {
      setMessages((prev) => [...prev, { role: 'assistant', text: fullText }])
    },
  })

  function send(question?: string) {
    const userText = (question ?? input).trim()
    if (!userText || status === 'streaming' || status === 'submitted') return

    setMessages((prev) => [...prev, { role: 'user', text: userText }])
    setInput('')
    reset()

    const history = [...messages, { role: 'user' as const, text: userText }].map((m) => ({
      role: m.role,
      parts: [{ type: 'text' as const, text: m.text }],
    }))

    setSource(
      fetchAlgoliaAgentStream({
        appId: APP_ID,
        apiKey: API_KEY,
        agentId: AGENT_ID,
        messages: history,
        cache,
      }),
    )
  }

  const isActive = status === 'streaming' || status === 'submitted'

  return (
    <div style={{ fontFamily: 'sans-serif', width: 520, maxWidth: '100%' }}>
      {/* Message history + live streaming bubble */}
      {(messages.length > 0 || isActive || status === 'error') && (
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 12,
            background: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? '#3b82f6' : '#fff',
                color: m.role === 'user' ? '#fff' : '#111827',
                border: m.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
                borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '8px 12px',
                maxWidth: '80%',
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.text}
            </div>
          ))}

          {/* In-progress assistant bubble — visible while submitted or streaming */}
          {(status === 'submitted' || status === 'streaming') && (
            <div
              style={{
                alignSelf: 'flex-start',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px 12px 12px 2px',
                padding: '8px 12px',
                maxWidth: '80%',
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {text === '' ? (
                <TypingIndicator visible variant="dots" />
              ) : (
                <StreamingText content={text} isStreaming cursor as="span" />
              )}
            </div>
          )}

          {/* Error bubble */}
          {status === 'error' && (
            <div
              style={{
                alignSelf: 'flex-start',
                color: '#ef4444',
                fontSize: 13,
                padding: '8px 12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
              }}
            >
              Error: {error?.message ?? 'Something went wrong'}
            </div>
          )}
        </div>
      )}

      {/* Starter questions (only shown before any messages) */}
      {messages.length === 0 && status === 'idle' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {STARTER_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              style={{
                padding: '5px 10px',
                fontSize: 12,
                borderRadius: 20,
                border: '1px solid #d1d5db',
                background: '#fff',
                cursor: 'pointer',
                color: '#374151',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask the agent…"
          disabled={isActive}
          style={{
            flex: 1,
            padding: '7px 12px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: 14,
            outline: 'none',
            opacity: isActive ? 0.6 : 1,
          }}
        />
        <button
          onClick={() => send()}
          disabled={isActive || !input.trim()}
          style={{
            padding: '7px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#3b82f6',
            color: '#fff',
            fontSize: 14,
            cursor: isActive || !input.trim() ? 'default' : 'pointer',
            opacity: isActive || !input.trim() ? 0.5 : 1,
          }}
        >
          {isActive ? '…' : 'Send'}
        </button>
      </div>

      {/* Status footer */}
      <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
        status: <strong>{status}</strong>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Default: Story = {
  render: (args) => <AlgoliaAgentDemo {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'Live demo hitting the Algolia Agent Studio API. Type a question or click a starter prompt. ' +
          'Tokens stream in real-time via `fetchAlgoliaAgentStream` → `useTokenStream`.',
      },
    },
  },
}
