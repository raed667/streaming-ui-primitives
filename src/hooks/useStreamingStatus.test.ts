import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDebouncedStreaming, useAISDKStatus } from './useStreamingStatus'
import { fromUseChatStatus } from '../types'

describe('useDebouncedStreaming', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns true immediately when isStreaming becomes true', () => {
    const { result, rerender } = renderHook(
      ({ streaming }) => useDebouncedStreaming(streaming, 150),
      { initialProps: { streaming: false } },
    )
    expect(result.current).toBe(false)

    rerender({ streaming: true })
    expect(result.current).toBe(true)
  })

  it('delays false transition by debounceMs', () => {
    const { result, rerender } = renderHook(
      ({ streaming }) => useDebouncedStreaming(streaming, 150),
      { initialProps: { streaming: true } },
    )
    expect(result.current).toBe(true)

    rerender({ streaming: false })
    // Still true immediately after going false
    expect(result.current).toBe(true)

    act(() => vi.advanceTimersByTime(149))
    expect(result.current).toBe(true)

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe(false)
  })

  it('cancels pending false if streaming resumes', () => {
    const { result, rerender } = renderHook(
      ({ streaming }) => useDebouncedStreaming(streaming, 150),
      { initialProps: { streaming: true } },
    )

    rerender({ streaming: false })
    act(() => vi.advanceTimersByTime(100))
    rerender({ streaming: true })
    act(() => vi.advanceTimersByTime(200))

    expect(result.current).toBe(true)
  })
})

describe('useAISDKStatus', () => {
  it('maps submitted → streaming', () => {
    const { result } = renderHook(() => useAISDKStatus('submitted'))
    expect(result.current).toBe('streaming')
  })

  it('maps streaming → streaming', () => {
    const { result } = renderHook(() => useAISDKStatus('streaming'))
    expect(result.current).toBe('streaming')
  })

  it('maps ready → complete', () => {
    const { result } = renderHook(() => useAISDKStatus('ready'))
    expect(result.current).toBe('complete')
  })

  it('maps error → error', () => {
    const { result } = renderHook(() => useAISDKStatus('error'))
    expect(result.current).toBe('error')
  })
})

describe('fromUseChatStatus (pure function)', () => {
  it.each([
    ['submitted', 'streaming'],
    ['streaming', 'streaming'],
    ['ready', 'complete'],
    ['error', 'error'],
  ] as const)('%s → %s', (input, expected) => {
    expect(fromUseChatStatus(input)).toBe(expected)
  })
})
