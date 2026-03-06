import { useEffect, useRef, useState } from 'react'
import type { StreamStatus, UseChatStatus } from '../types'
import { fromUseChatStatus } from '../types'

/**
 * Debounces `isStreaming` to prevent flicker when a stream pauses briefly.
 *
 * @param isStreaming - raw streaming boolean
 * @param debounceMs  - how long to wait before declaring streaming stopped (default 150ms)
 * @returns stabilised boolean
 */
export function useDebouncedStreaming(
  isStreaming: boolean,
  debounceMs = 150,
): boolean {
  const [stable, setStable] = useState(isStreaming)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isStreaming) {
      // Went true immediately — cancel any pending false transition
      if (timerRef.current != null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setStable(true)
    } else {
      // Delay the false transition
      timerRef.current = setTimeout(() => {
        setStable(false)
        timerRef.current = null
      }, debounceMs)
    }
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isStreaming, debounceMs])

  return stable
}

/**
 * Maps a Vercel AI SDK `useChat` status to our `StreamStatus`.
 *
 * Usage:
 * ```ts
 * const { status } = useChat(...)
 * const streamStatus = useAISDKStatus(status)
 * ```
 */
export function useAISDKStatus(chatStatus: UseChatStatus): StreamStatus {
  return fromUseChatStatus(chatStatus)
}
