import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useMessageStream } from './useMessageStream'
import type { UIMessagePartCompat } from '../types'

describe('useMessageStream', () => {
  it('returns empty values for empty parts array', () => {
    const { result } = renderHook(() => useMessageStream([]))
    expect(result.current.text).toBe('')
    expect(result.current.reasoning).toBe('')
    expect(result.current.hasActiveToolCall).toBe(false)
    expect(result.current.hasReasoning).toBe(false)
    expect(result.current.sourceUrls).toEqual([])
  })

  it('concatenates all text parts', () => {
    const parts: UIMessagePartCompat[] = [
      { type: 'text', text: 'Hello' },
      { type: 'text', text: ' world' },
    ]
    const { result } = renderHook(() => useMessageStream(parts))
    expect(result.current.text).toBe('Hello world')
  })

  it('extracts reasoning parts', () => {
    const parts: UIMessagePartCompat[] = [
      { type: 'reasoning', reasoning: 'Let me think...' },
      { type: 'text', text: 'The answer is 42.' },
    ]
    const { result } = renderHook(() => useMessageStream(parts))
    expect(result.current.reasoning).toBe('Let me think...')
    expect(result.current.hasReasoning).toBe(true)
    expect(result.current.text).toBe('The answer is 42.')
  })

  it('detects active tool calls (non-result state)', () => {
    const parts: UIMessagePartCompat[] = [
      { type: 'tool-invocation', toolCallId: '1', toolName: 'search', state: 'call' },
    ]
    const { result } = renderHook(() => useMessageStream(parts))
    expect(result.current.hasActiveToolCall).toBe(true)
  })

  it('does not flag completed tool calls', () => {
    const parts: UIMessagePartCompat[] = [
      { type: 'tool-invocation', toolCallId: '1', toolName: 'search', state: 'result' },
    ]
    const { result } = renderHook(() => useMessageStream(parts))
    expect(result.current.hasActiveToolCall).toBe(false)
  })

  it('collects source URLs', () => {
    const parts: UIMessagePartCompat[] = [
      { type: 'source-url', url: 'https://example.com', title: 'Example' },
      { type: 'source-url', url: 'https://other.com' },
    ]
    const { result } = renderHook(() => useMessageStream(parts))
    expect(result.current.sourceUrls).toEqual([
      { url: 'https://example.com', title: 'Example' },
      { url: 'https://other.com' },
    ])
  })

  it('ignores unknown part types (forward compat)', () => {
    const parts: UIMessagePartCompat[] = [
      { type: 'text', text: 'hi' },
      { type: 'future-unknown-type', someData: 123 } as unknown as UIMessagePartCompat,
    ]
    const { result } = renderHook(() => useMessageStream(parts))
    expect(result.current.text).toBe('hi')
  })
})
