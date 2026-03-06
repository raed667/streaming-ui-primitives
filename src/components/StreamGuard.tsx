import React, { type ReactNode } from 'react'
import type { StreamStatus } from '../types'

export interface StreamGuardProps {
  /**
   * Current stream status. Use `fromUseChatStatus` to convert from
   * Vercel AI SDK's useChat status.
   */
  status: StreamStatus
  /** Rendered when status is 'idle' */
  idle?: ReactNode
  /** Rendered when status is 'streaming' */
  streaming?: ReactNode
  /** Rendered when status is 'complete' */
  complete?: ReactNode
  /**
   * Rendered when status is 'error'.
   * Pass a function to receive the error object.
   */
  error?: ReactNode | ((error: Error | null) => ReactNode)
  /**
   * The error object. Forwarded to the `error` render prop when it's a function.
   */
  errorValue?: Error | null
}

/**
 * Status-driven render slots for streaming UI.
 *
 * Renders a different React subtree depending on the current stream status.
 * Think of it as a type-safe switch/case over stream lifecycle states.
 *
 * @example
 * // Basic usage with useTokenStream
 * const { status } = useTokenStream(myStream)
 *
 * <StreamGuard
 *   status={status}
 *   idle={<p>Ask me anything...</p>}
 *   streaming={<TypingIndicator visible />}
 *   complete={<StreamingText content={text} />}
 *   error={(err) => <p>Error: {err?.message}</p>}
 * />
 *
 * @example
 * // With Vercel AI SDK useChat
 * const { status } = useChat(...)
 * const streamStatus = fromUseChatStatus(status)
 *
 * <StreamGuard
 *   status={streamStatus}
 *   streaming={<TypingIndicator visible />}
 *   complete={<div>{messages.map(...)}</div>}
 * />
 */
export function StreamGuard({
  status,
  idle,
  streaming,
  complete,
  error,
  errorValue = null,
}: StreamGuardProps) {
  switch (status) {
    case 'idle':
      return idle != null ? <>{idle}</> : null
    case 'streaming':
      return streaming != null ? <>{streaming}</> : null
    case 'complete':
      return complete != null ? <>{complete}</> : null
    case 'error':
      if (error == null) return null
      if (typeof error === 'function') {
        return <>{error(errorValue)}</>
      }
      return <>{error}</>
    default:
      return null
  }
}
