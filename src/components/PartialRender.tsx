import React, {
  type ReactNode,
  Component,
  type ErrorInfo,
  type ReactElement,
} from 'react'

export interface PartialRenderProps {
  /**
   * The (potentially partial/incomplete) content string to render.
   * Typically the accumulated text from a streaming response.
   */
  content: string
  /**
   * Custom render function. Called with the current content and whether
   * the stream is complete. Use `isComplete` to decide how aggressively
   * to parse — e.g. skip closing markdown fences during streaming.
   *
   * @example
   * // With marked:
   * renderer={(content, isComplete) => (
   *   <div dangerouslySetInnerHTML={{ __html: marked(content) }} />
   * )}
   *
   * @example
   * // Plain text fallback:
   * renderer={(content) => <p style={{ whiteSpace: 'pre-wrap' }}>{content}</p>}
   */
  renderer: (content: string, isComplete: boolean) => ReactNode
  /**
   * Whether the stream has finished. When false, the renderer receives
   * `isComplete=false`, signalling it should handle partial content leniently.
   * @default true
   */
  isComplete?: boolean
  /**
   * Shown when `content` is empty (before the first token arrives).
   */
  fallback?: ReactNode
  /**
   * Shown when the renderer throws during streaming.
   * If not provided, the raw content is shown as a plain-text fallback.
   */
  errorFallback?: ReactNode | ((error: Error, content: string) => ReactNode)
  className?: string
  style?: React.CSSProperties
}

interface ErrorBoundaryState {
  error: Error | null
}

interface ErrorBoundaryProps {
  content: string
  fallback: ReactNode | ((error: Error, content: string) => ReactNode) | undefined
  children: ReactNode
  resetKey: string
}

class RenderErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log in dev only — use typeof check to avoid requiring @types/node
    if (typeof globalThis !== 'undefined' && (globalThis as Record<string, unknown>)['__DEV__']) {
      console.warn('[PartialRender] Renderer threw during streaming:', error, info)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error != null) {
      this.setState({ error: null })
    }
  }

  render(): ReactNode {
    const { error } = this.state
    if (error != null) {
      const { fallback, content } = this.props
      if (fallback == null) {
        return <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
      }
      if (typeof fallback === 'function') {
        return (fallback as (e: Error, c: string) => ReactNode)(error, content)
      }
      return fallback as ReactElement
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Inner component — calls the renderer *inside* the error boundary so that
// any throw is caught by the boundary rather than the parent render.
// ---------------------------------------------------------------------------

interface RendererInvokerProps {
  renderer: (content: string, isComplete: boolean) => ReactNode
  content: string
  isComplete: boolean
}

function RendererInvoker({ renderer, content, isComplete }: RendererInvokerProps) {
  return <>{renderer(content, isComplete)}</>
}

/**
 * Gracefully renders partial/incomplete content during streaming.
 *
 * Uses an error boundary to catch parse errors mid-stream (e.g. from
 * markdown parsers receiving incomplete syntax) and fall back to plain text.
 * The boundary resets when content resets to empty (new stream).
 *
 * This component is **renderer-agnostic** — pass any render function to keep
 * the bundle size near zero.
 *
 * @example
 * // Stream markdown with the `marked` library
 * import { marked } from 'marked'
 *
 * <PartialRender
 *   content={streamingText}
 *   isComplete={status === 'complete'}
 *   renderer={(content, isComplete) => (
 *     <div dangerouslySetInnerHTML={{ __html: marked(content) }} />
 *   )}
 *   fallback={<span>Thinking...</span>}
 * />
 */
export function PartialRender({
  content,
  renderer,
  isComplete = true,
  fallback,
  errorFallback,
  className,
  style,
}: PartialRenderProps) {
  if (content.length === 0) {
    return fallback != null ? <>{fallback}</> : null
  }

  return (
    <span className={className} style={style}>
      <RenderErrorBoundary
        content={content}
        fallback={errorFallback}
        resetKey={content.length === 0 ? 'empty' : 'content'}
      >
        <RendererInvoker renderer={renderer} content={content} isComplete={isComplete} />
      </RenderErrorBoundary>
    </span>
  )
}
