import type { Meta, StoryObj } from '@storybook/react'
import { TypingIndicator } from '../components/TypingIndicator'

const meta: Meta<typeof TypingIndicator> = {
  title: 'Primitives/TypingIndicator',
  component: TypingIndicator,
  tags: ['autodocs'],
  argTypes: {
    visible: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['dots', 'pulse', 'bar'],
    },
    'aria-label': { control: 'text' },
  },
}
export default meta

type Story = StoryObj<typeof TypingIndicator>

export const Dots: Story = {
  args: { visible: true, variant: 'dots' },
}

export const Pulse: Story = {
  args: { visible: true, variant: 'pulse' },
}

export const Bar: Story = {
  args: { visible: true, variant: 'bar' },
}

export const Hidden: Story = {
  args: { visible: false, variant: 'dots' },
  parameters: {
    docs: { description: { story: 'When `visible=false` the component renders nothing.' } },
  },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <TypingIndicator visible variant="dots" />
        <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>dots</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <TypingIndicator visible variant="pulse" />
        <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>pulse</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <TypingIndicator visible variant="bar" />
        <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>bar</p>
      </div>
    </div>
  ),
}

export const InheritedColor: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '24px' }}>
      {(['#3b82f6', '#10b981', '#f59e0b', '#ef4444'] as const).map(color => (
        <span key={color} style={{ color }}>
          <TypingIndicator visible variant="dots" />
        </span>
      ))}
    </div>
  ),
  parameters: {
    docs: { description: { story: 'Inherits `currentColor` — no className needed to theme it.' } },
  },
}
