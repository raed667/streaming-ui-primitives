import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useTokenStream } from './useTokenStream'

// Helpers ---------------------------------------------------------------

async function* asyncTokens(tokens: string[]): AsyncIterable<string> {
  for (const t of tokens) {
    yield t
  }
}

function makeReadableStream(tokens: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const t of tokens) {
        controller.enqueue(encoder.encode(t))
      }
      controller.close()
    },
  })
}

// Tests -----------------------------------------------------------------

describe('useTokenStream', () => {
  it('starts idle when source is null', () => {
    const { result } = renderHook(() => useTokenStream(null))
    expect(result.current.status).toBe('idle')
    expect(result.current.text).toBe('')
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('starts idle with undefined source', () => {
    const { result } = renderHook(() => useTokenStream(undefined))
    expect(result.current.status).toBe('idle')
  })

  it('accumulates text from AsyncIterable<string>', async () => {
    const source = asyncTokens(['Hello', ', ', 'world'])
    const { result } = renderHook(() => useTokenStream(source))

    await waitFor(() => expect(result.current.status).toBe('complete'), { timeout: 3000 })

    expect(result.current.text).toBe('Hello, world')
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('accumulates text from ReadableStream<Uint8Array>', async () => {
    const source = makeReadableStream(['foo', 'bar', 'baz'])
    const { result } = renderHook(() => useTokenStream(source))

    await waitFor(() => expect(result.current.status).toBe('complete'), { timeout: 3000 })

    expect(result.current.text).toBe('foobarbaz')
  })

  it('isStreaming is false when stream completes', async () => {
    const source = asyncTokens(['a', 'b'])
    const { result } = renderHook(() => useTokenStream(source))

    await waitFor(() => expect(result.current.status).toBe('complete'), { timeout: 3000 })

    expect(result.current.isStreaming).toBe(false)
    expect(result.current.text).toBe('ab')
  })

  it('captures errors and sets status to error', async () => {
    async function* failingStream(): AsyncIterable<string> {
      yield 'partial'
      throw new Error('stream broke')
    }

    // Create generator OUTSIDE renderHook so the reference is stable
    // and the effect doesn't re-fire on every render cycle.
    const source = failingStream()
    const { result } = renderHook(() => useTokenStream(source))

    await waitFor(() => expect(result.current.text).toBe('partial'), { timeout: 3000 })
    await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 3000 })

    expect(result.current.error?.message).toBe('stream broke')
    expect(result.current.text).toBe('partial')
  })

  it('abort() stops the stream and sets status to idle without clearing text', async () => {
    // Use a slow stream that we can abort mid-way
    async function* slowStream(): AsyncIterable<string> {
      yield 'first'
      await new Promise(resolve => setTimeout(resolve, 10000)) // very slow
      yield 'second' // should never arrive
    }

    const source = slowStream()
    const { result } = renderHook(() => useTokenStream(source))

    // Wait for first token
    await waitFor(() => expect(result.current.text).toBe('first'), { timeout: 3000 })

    // Abort mid-stream
    act(() => result.current.abort())

    // Status goes to idle, text is preserved
    expect(result.current.status).toBe('idle')
    expect(result.current.text).toBe('first')
    expect(result.current.isStreaming).toBe(false)
  })

  it('resets state when reset() is called', async () => {
    const source = asyncTokens(['a', 'b', 'c'])
    const { result } = renderHook(() => useTokenStream(source))

    await waitFor(() => expect(result.current.status).toBe('complete'), { timeout: 3000 })
    expect(result.current.text).toBe('abc')

    act(() => result.current.reset())

    expect(result.current.status).toBe('idle')
    expect(result.current.text).toBe('')
    expect(result.current.error).toBeNull()
  })
})
