import type { Meta, StoryObj } from '@storybook/react'
import React, { useEffect, useRef, useState } from 'react'
import { StreamingText } from '../components/StreamingText'

const meta: Meta<typeof StreamingText> = {
  title: 'Primitives/StreamingText',
  component: StreamingText,
  tags: ['autodocs'],
  argTypes: {
    content: { control: 'text' },
    cursor: { control: 'boolean' },
    isStreaming: { control: 'boolean' },
    as: {
      control: 'select',
      options: ['span', 'p', 'div', 'h1', 'h2', 'h3'],
    },
  },
}
export default meta

type Story = StoryObj<typeof StreamingText>

export const Static: Story = {
  args: {
    content: 'Hello, world! This is a completed message.',
    cursor: false,
    isStreaming: false,
  },
}

export const WithCursor: Story = {
  args: {
    content: 'The model is still generating',
    cursor: true,
    isStreaming: true,
  },
}

export const CursorHiddenWhenDone: Story = {
  args: {
    content: 'Stream finished — cursor gone.',
    cursor: true,
    isStreaming: false,
  },
}

const SAMPLE_TOKENS = [
  'The ', 'quick ', 'brown ', 'fox ', 'jumps ', 'over ', 'the ', 'lazy ', 'dog. ',
  'Streaming ', 'token ', 'by ', 'token ', 'is ', 'what ', 'we ', 'do ',
  'here — ', 'one ', 'chunk ', 'at ', 'a ', 'time.',
]

function LiveStreamDemo({ speed = 80 }: { speed?: number }) {
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function start() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setText('')
    setStreaming(true)
    let i = 0
    function tick() {
      if (i >= SAMPLE_TOKENS.length) {
        setStreaming(false)
        return
      }
      const token = SAMPLE_TOKENS[i++] ?? ''
      setText(prev => prev + token)
      timerRef.current = setTimeout(tick, speed)
    }
    timerRef.current = setTimeout(tick, speed)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div style={{ maxWidth: 480 }} data-streaming={streaming ? 'true' : 'false'}>
      <p style={{ fontFamily: 'sans-serif', fontSize: 16, lineHeight: 1.6 }}>
        <StreamingText content={text} cursor isStreaming={streaming} as="span" />
      </p>
      <button
        onClick={start}
        disabled={streaming}
        style={{ marginTop: 12, padding: '6px 16px', cursor: streaming ? 'default' : 'pointer' }}
      >
        {streaming ? 'Streaming…' : 'Replay'}
      </button>
    </div>
  )
}

export const LiveStreaming: Story = {
  render: () => <LiveStreamDemo />,
  parameters: {
    docs: { description: { story: 'Click Replay to watch tokens arrive one by one.' } },
  },
}

export const CustomCursor: Story = {
  args: {
    content: 'Custom cursor below',
    cursor: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>▌</span>,
    isStreaming: true,
  },
}

export const AsHeading: Story = {
  args: {
    content: 'Streaming heading text',
    cursor: true,
    isStreaming: true,
    as: 'h2',
  },
}
