import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PartialRender } from './PartialRender'

describe('PartialRender', () => {
  it('renders nothing when content is empty and no fallback', () => {
    const { container } = render(
      <PartialRender content="" renderer={c => <p>{c}</p>} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders fallback when content is empty', () => {
    render(
      <PartialRender
        content=""
        renderer={c => <p>{c}</p>}
        fallback={<span>Loading…</span>}
      />,
    )
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('calls renderer with content and isComplete', () => {
    const renderer = vi.fn((content: string) => <p>{content}</p>)
    render(<PartialRender content="hello" renderer={renderer} isComplete={false} />)
    expect(renderer).toHaveBeenCalledWith('hello', false)
  })

  it('passes isComplete=true by default', () => {
    const renderer = vi.fn((content: string, isComplete: boolean) => (
      <p data-complete={String(isComplete)}>{content}</p>
    ))
    render(<PartialRender content="hi" renderer={renderer} />)
    expect(renderer).toHaveBeenCalledWith('hi', true)
  })

  it('renders the output of the renderer', () => {
    render(
      <PartialRender
        content="**bold**"
        renderer={c => <em data-testid="rendered">{c}</em>}
      />,
    )
    expect(screen.getByTestId('rendered')).toBeInTheDocument()
    expect(screen.getByTestId('rendered').textContent).toBe('**bold**')
  })

  it('uses error boundary to catch renderer errors and show raw text', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const brokenRenderer = (): never => {
      throw new Error('parse error')
    }
    render(<PartialRender content="raw content" renderer={brokenRenderer} />)
    expect(screen.getByText('raw content')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('uses custom errorFallback when renderer throws', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const brokenRenderer = (): never => {
      throw new Error('oops')
    }
    render(
      <PartialRender
        content="data"
        renderer={brokenRenderer}
        errorFallback={<span>Render failed</span>}
      />,
    )
    expect(screen.getByText('Render failed')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('passes className and style', () => {
    const { container } = render(
      <PartialRender
        content="hi"
        renderer={c => <span>{c}</span>}
        className="wrap"
        style={{ color: 'blue' }}
      />,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toBe('wrap')
    expect(wrapper.style.color).toBe('blue')
  })
})
