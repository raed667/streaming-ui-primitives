import React, { type ElementType, type ReactNode } from 'react'

export interface StreamingTextProps {
  /**
   * The accumulated text to display. Append tokens to this string to drive
   * the streaming animation. Works naturally with useTokenStream().text or
   * Vercel AI SDK useChat message parts text.
   */
  content: string
  /**
   * Show a blinking cursor at the end of the text while streaming.
   * Pass `true` for the default cursor (|) or a custom ReactNode.
   * @default false
   */
  cursor?: boolean | ReactNode
  /**
   * Whether the stream is still active. Controls cursor visibility when
   * `cursor` is enabled. When false, cursor is hidden.
   * @default true
   */
  isStreaming?: boolean
  /**
   * The HTML element to render as.
   * @default 'span'
   */
  as?: ElementType
  className?: string
  style?: React.CSSProperties
}

const DEFAULT_CURSOR = (
  <span
    aria-hidden="true"
    data-streaming-cursor=""
    style={{
      display: 'inline-block',
      width: '2px',
      height: '1em',
      background: 'currentColor',
      marginLeft: '1px',
      verticalAlign: 'text-bottom',
      animation: 'streaming-cursor-blink 1s step-end infinite',
    }}
  />
)

const CURSOR_STYLE = `
@keyframes streaming-cursor-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
`

let styleInjected = false

function ensureCursorStyle() {
  if (styleInjected || typeof document === 'undefined') return
  const el = document.createElement('style')
  el.textContent = CURSOR_STYLE
  el.setAttribute('data-streaming-cursor-style', '')
  document.head.appendChild(el)
  styleInjected = true
}

/**
 * Renders text that grows token-by-token.
 *
 * Pair with `useTokenStream` for raw streams, or pass the accumulated
 * text directly from Vercel AI SDK's `useChat` message parts.
 *
 * This component is **unstyled** — no fonts, colors, or layout are applied.
 *
 * @example
 * ```tsx
 * // With useTokenStream
 * const { text, isStreaming } = useTokenStream(myStream)
 * <StreamingText content={text} isStreaming={isStreaming} cursor />
 * ```
 *
 * @example
 * ```tsx
 * // With Vercel AI SDK useChat
 * const { text } = useMessageStream(message.parts)
 * <StreamingText content={text} isStreaming={status === 'streaming'} cursor />
 * ```
 */
export function StreamingText({
  content,
  cursor = false,
  isStreaming = true,
  as: Tag = 'span',
  className,
  style,
}: StreamingTextProps) {
  const showCursor = cursor !== false && isStreaming

  if (showCursor) {
    ensureCursorStyle()
  }

  const cursorNode = showCursor ? (cursor === true ? DEFAULT_CURSOR : cursor) : null

  return (
    <Tag className={className} style={style}>
      {content}
      {cursorNode}
    </Tag>
  )
}
