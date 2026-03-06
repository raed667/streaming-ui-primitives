import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StreamGuard } from './StreamGuard'

describe('StreamGuard', () => {
  it('renders idle slot when status=idle', () => {
    render(<StreamGuard status="idle" idle={<p>Start here</p>} />)
    expect(screen.getByText('Start here')).toBeInTheDocument()
  })

  it('renders streaming slot when status=streaming', () => {
    render(<StreamGuard status="streaming" streaming={<p>Streaming…</p>} />)
    expect(screen.getByText('Streaming…')).toBeInTheDocument()
  })

  it('renders complete slot when status=complete', () => {
    render(<StreamGuard status="complete" complete={<p>Done</p>} />)
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('renders error slot (ReactNode) when status=error', () => {
    render(<StreamGuard status="error" error={<p>Something went wrong</p>} />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders error slot as function with errorValue', () => {
    const err = new Error('fail')
    render(
      <StreamGuard
        status="error"
        error={e => <p>{e?.message}</p>}
        errorValue={err}
      />,
    )
    expect(screen.getByText('fail')).toBeInTheDocument()
  })

  it('renders nothing when status slot is not provided', () => {
    const { container } = render(<StreamGuard status="idle" />)
    expect(container.firstChild).toBeNull()
  })

  it('only renders the matching slot (not others)', () => {
    render(
      <StreamGuard
        status="streaming"
        idle={<p>idle</p>}
        streaming={<p>streaming</p>}
        complete={<p>complete</p>}
      />,
    )
    expect(screen.getByText('streaming')).toBeInTheDocument()
    expect(screen.queryByText('idle')).not.toBeInTheDocument()
    expect(screen.queryByText('complete')).not.toBeInTheDocument()
  })
})
