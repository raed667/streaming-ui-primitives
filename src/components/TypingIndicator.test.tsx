import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TypingIndicator } from './TypingIndicator'

describe('TypingIndicator', () => {
  it('renders nothing when visible=false', () => {
    const { container } = render(<TypingIndicator visible={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders when visible=true', () => {
    render(<TypingIndicator visible />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has accessible aria-label', () => {
    render(<TypingIndicator visible />)
    expect(screen.getByRole('status', { name: 'AI is typing' })).toBeInTheDocument()
  })

  it('accepts custom aria-label', () => {
    render(<TypingIndicator visible aria-label="Bot is thinking" />)
    expect(screen.getByRole('status', { name: 'Bot is thinking' })).toBeInTheDocument()
  })

  it('renders dots variant (default)', () => {
    const { container } = render(<TypingIndicator visible variant="dots" />)
    expect(container.querySelector('[data-stp-dots]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-stp-dot]')).toHaveLength(3)
  })

  it('renders pulse variant', () => {
    const { container } = render(<TypingIndicator visible variant="pulse" />)
    expect(container.querySelector('[data-stp-pulse]')).toBeInTheDocument()
  })

  it('renders bar variant', () => {
    const { container } = render(<TypingIndicator visible variant="bar" />)
    expect(container.querySelector('[data-stp-bars]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-stp-bar]')).toHaveLength(3)
  })

  it('passes className to the root element', () => {
    render(<TypingIndicator visible className="custom" />)
    expect(screen.getByRole('status').className).toBe('custom')
  })
})
