import React from 'react'
import { partsToText } from '@raed667/streaming-ui-primitives/adapters'
import type { UIMessageCompat } from '@raed667/streaming-ui-primitives'

interface Props {
  messages: UIMessageCompat[]
}

export function ConversationHistory({ messages }: Props) {
  if (messages.length === 0) {
    return (
      <div style={styles.empty}>
        Send a message to start the conversation.
      </div>
    )
  }

  return (
    <div style={styles.history}>
      {messages.map(msg => (
        <div
          key={msg.id}
          style={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}
        >
          <span style={styles.role}>{msg.role === 'user' ? 'You' : 'Assistant'}</span>
          <p style={styles.text}>{partsToText(msg.parts)}</p>
        </div>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  empty: { color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '32px 0' },
  history: { display: 'flex', flexDirection: 'column', gap: 8 },
  userBubble: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '10px 14px', alignSelf: 'flex-end', maxWidth: '80%' },
  assistantBubble: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 14px' },
  role: { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'block', marginBottom: 4 },
  text: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#111827' },
}
