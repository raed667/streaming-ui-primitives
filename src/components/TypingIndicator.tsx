import React from 'react'

export type TypingIndicatorVariant = 'dots' | 'pulse' | 'bar'

export interface TypingIndicatorProps {
  /** Whether the indicator is visible */
  visible: boolean
  /**
   * Visual style variant.
   * - `dots`  — three bouncing dots (default)
   * - `pulse` — single pulsing circle
   * - `bar`   — three animated vertical bars
   */
  variant?: TypingIndicatorVariant
  className?: string
  style?: React.CSSProperties
  /** Accessible label for screen readers */
  'aria-label'?: string
}

const STYLES = `
@keyframes stp-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40%            { transform: translateY(-6px); opacity: 1; }
}
@keyframes stp-pulse {
  0%, 100% { transform: scale(0.8); opacity: 0.5; }
  50%      { transform: scale(1.2); opacity: 1; }
}
@keyframes stp-bar {
  0%, 100% { transform: scaleY(0.4); opacity: 0.4; }
  50%      { transform: scaleY(1); opacity: 1; }
}
[data-stp-dots] {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
[data-stp-dot] {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: stp-bounce 1.2s ease-in-out infinite;
}
[data-stp-dot]:nth-child(2) { animation-delay: 0.2s; }
[data-stp-dot]:nth-child(3) { animation-delay: 0.4s; }
[data-stp-pulse] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
[data-stp-pulse-circle] {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  animation: stp-pulse 1s ease-in-out infinite;
}
[data-stp-bars] {
  display: inline-flex;
  align-items: flex-end;
  gap: 3px;
  height: 14px;
}
[data-stp-bar] {
  width: 4px;
  height: 100%;
  background: currentColor;
  border-radius: 2px;
  transform-origin: bottom;
  animation: stp-bar 1s ease-in-out infinite;
}
[data-stp-bar]:nth-child(2) { animation-delay: 0.15s; }
[data-stp-bar]:nth-child(3) { animation-delay: 0.3s; }
`

let styleInjected = false
function ensureStyles() {
  if (styleInjected || typeof document === 'undefined') return
  const el = document.createElement('style')
  el.textContent = STYLES
  el.setAttribute('data-stp-style', '')
  document.head.appendChild(el)
  styleInjected = true
}

function DotsVariant() {
  return (
    <span data-stp-dots="">
      <span data-stp-dot="" />
      <span data-stp-dot="" />
      <span data-stp-dot="" />
    </span>
  )
}

function PulseVariant() {
  return (
    <span data-stp-pulse="">
      <span data-stp-pulse-circle="" />
    </span>
  )
}

function BarVariant() {
  return (
    <span data-stp-bars="">
      <span data-stp-bar="" />
      <span data-stp-bar="" />
      <span data-stp-bar="" />
    </span>
  )
}

/**
 * Animated "AI is thinking" indicator.
 *
 * Completely **unstyled** beyond inline animations — inherits `color` from
 * the parent so it naturally fits any theme.
 *
 * @example
 * ```tsx
 * <TypingIndicator visible={status === 'streaming'} />
 * <TypingIndicator visible={isLoading} variant="pulse" />
 * ```
 */
export function TypingIndicator({
  visible,
  variant = 'dots',
  className,
  style,
  'aria-label': ariaLabel = 'AI is typing',
}: TypingIndicatorProps) {
  ensureStyles()

  if (!visible) return null

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      className={className}
      style={style}
    >
      {variant === 'dots' && <DotsVariant />}
      {variant === 'pulse' && <PulseVariant />}
      {variant === 'bar' && <BarVariant />}
    </span>
  )
}
