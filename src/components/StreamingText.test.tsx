import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StreamingText } from './StreamingText'

describe('StreamingText', () => {
  it('renders content as text', () => {
    render(<StreamingText content="Hello world" />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders as span by default', () => {
    const { container } = render(<StreamingText content="test" />)
    expect(container.firstChild?.nodeName).toBe('SPAN')
  })

  it('renders as custom element via `as` prop', () => {
    const { container } = render(<StreamingText content="test" as="p" />)
    expect(container.firstChild?.nodeName).toBe('P')
  })

  it('renders cursor when cursor=true and isStreaming=true', () => {
    const { container } = render(<StreamingText content="Hello" cursor isStreaming />)
    expect(container.querySelector('[data-streaming-cursor]')).toBeInTheDocument()
  })

  it('does not render cursor when isStreaming=false', () => {
    const { container } = render(<StreamingText content="Hello" cursor isStreaming={false} />)
    expect(container.querySelector('[data-streaming-cursor]')).not.toBeInTheDocument()
  })

  it('does not render cursor when cursor=false', () => {
    const { container } = render(<StreamingText content="Hello" cursor={false} isStreaming />)
    expect(container.querySelector('[data-streaming-cursor]')).not.toBeInTheDocument()
  })

  it('renders a custom cursor node', () => {
    render(
      <StreamingText
        content="Hi"
        cursor={<span data-testid="custom-cursor">▌</span>}
        isStreaming
      />,
    )
    expect(screen.getByTestId('custom-cursor')).toBeInTheDocument()
  })

  it('passes className and style to the wrapper', () => {
    const { container } = render(
      <StreamingText content="test" className="my-class" style={{ color: 'red' }} />,
    )
    const el = container.firstChild as HTMLElement
    expect(el.className).toBe('my-class')
    expect(el.style.color).toBe('red')
  })

  it('renders empty content without error', () => {
    const { container } = render(<StreamingText content="" />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
