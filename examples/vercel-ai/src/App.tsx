/**
 * Vercel AI SDK integration example.
 *
 * This example simulates the Vercel AI SDK `useChat` hook shape locally
 * (no live LLM required by default). It demonstrates:
 *
 *  - fromUseChatStatus()   — mapping useChat status → StreamStatus
 *  - useMessageStream()    — extracting text/reasoning/tool state from UIMessage.parts
 *  - StreamGuard           — idle / streaming / complete / error render slots
 *  - TypingIndicator       — shown while a tool call is active
 *  - useDebouncedStreaming — smoothing rapid status transitions
 *  - Multi-turn history    — rendering previous messages
 *
 * The mock server at server/index.ts streams Vercel AI SDK-compatible
 * UIMessage.parts JSON. Set USE_REAL_SDK=true in .env to use a real LLM.
 */
import React, { useState, useCallback } from 'react'
import {
  fromUseChatStatus,
  useMessageStream,
  useDebouncedStreaming,
  StreamGuard,
  TypingIndicator,
  StreamingText,
  type UIMessageCompat,
  type UseChatStatus,
} from 'streaming-ui-primitives'
import { ConversationHistory } from './components/ConversationHistory'

// ---------------------------------------------------------------------------
// Types mirroring Vercel AI SDK useChat return shape (structural, no runtime dep)
// ---------------------------------------------------------------------------
interface SimulatedChatState {
  messages: UIMessageCompat[]
  status: UseChatStatus
  error: Error | undefined
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export function App() {
  const [input, setInput] = useState('')
  const [chatState, setChatState] = useState<SimulatedChatState>({
    messages: [],
    status: 'ready',
    error: undefined,
  })

  // The "current" assistant message being streamed (last message if assistant)
  const lastMsg = chatState.messages[chatState.messages.length - 1]
  const assistantMsg = lastMsg?.role === 'assistant' ? lastMsg : null

  // Bridge Vercel AI SDK status → StreamStatus
  const streamStatus = fromUseChatStatus(chatState.status)

  // Extract derived values from UIMessage.parts
  const { text, reasoning, hasActiveToolCall, hasReasoning, sourceUrls } =
    useMessageStream(assistantMsg?.parts ?? [])

  // Debounce to prevent flicker between tokens
  const isStreamingDebounced = useDebouncedStreaming(streamStatus === 'streaming', 150)

  const sendMessage = useCallback(async () => {
    if (!input.trim() || chatState.status === 'streaming' || chatState.status === 'submitted') return

    const userMsg: UIMessageCompat = {
      id: crypto.randomUUID(),
      role: 'user',
      parts: [{ type: 'text', text: input.trim() }],
    }
    const assistantId = crypto.randomUUID()

    setChatState(prev => ({
      messages: [
        ...prev.messages,
        userMsg,
        { id: assistantId, role: 'assistant', parts: [] },
      ],
      status: 'submitted',
      error: undefined,
    }))
    setInput('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...chatState.messages, userMsg] }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      setChatState(prev => ({ ...prev, status: 'streaming' }))

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.trim())

        for (const line of lines) {
          try {
            const part = JSON.parse(line) as UIMessageCompat['parts'][number]
            setChatState(prev => {
              const msgs = [...prev.messages]
              const last = msgs[msgs.length - 1]
              if (last?.role === 'assistant') {
                // Merge text parts, replace others
                const existingText = part.type === 'text'
                  ? last.parts.find((p): p is { type: 'text'; text: string } => p.type === 'text')
                  : undefined
                if (existingText && part.type === 'text') {
                  const newText = existingText.text + part.text
                  const updatedParts = last.parts.map(p =>
                    p === existingText ? { type: 'text' as const, text: newText } : p
                  )
                  msgs[msgs.length - 1] = { ...last, parts: updatedParts }
                } else {
                  msgs[msgs.length - 1] = { ...last, parts: [...last.parts, part] }
                }
              }
              return { ...prev, messages: msgs }
            })
          } catch {
            // incomplete JSON line — skip
          }
        }
      }

      setChatState(prev => ({ ...prev, status: 'ready' }))
    } catch (err) {
      setChatState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err : new Error(String(err)),
      }))
    }
  }, [input, chatState])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const reset = () => setChatState({ messages: [], status: 'ready', error: undefined })

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <h1 style={styles.title}>Vercel AI SDK integration</h1>
        <p style={styles.subtitle}>
          Demonstrates <code>useMessageStream</code>, <code>fromUseChatStatus</code>,{' '}
          <code>StreamGuard</code>, <code>TypingIndicator</code>, <code>useDebouncedStreaming</code>
        </p>
        <button onClick={reset} style={styles.resetBtn}>Clear conversation</button>
      </div>

      <div style={styles.chat}>
        {/* Conversation history (all complete messages) */}
        <ConversationHistory
          messages={chatState.messages.slice(0, assistantMsg ? -1 : undefined)}
        />

        {/* Current streaming response */}
        {assistantMsg && (
          <div style={styles.assistantBubble}>
            {/* Tool call indicator */}
            <TypingIndicator
              visible={hasActiveToolCall}
              aria-label="Running tool..."
              style={{ marginBottom: 8 }}
            />

            {/* Reasoning section */}
            {hasReasoning && (
              <div style={styles.reasoning}>
                <span style={styles.reasoningLabel}>Thinking</span>
                <StreamingText
                  content={reasoning}
                  isStreaming={isStreamingDebounced}
                  as="p"
                  style={styles.reasoningText}
                />
              </div>
            )}

            {/* Main response via StreamGuard */}
            <StreamGuard
              status={streamStatus}
              idle={null}
              submitted={
                <p style={{ ...styles.messageText, color: '#9ca3af', fontStyle: 'italic' }}>
                  Sending request…
                </p>
              }
              streaming={
                <StreamingText
                  content={text}
                  isStreaming
                  cursor
                  as="p"
                  style={styles.messageText}
                />
              }
              complete={
                <p style={styles.messageText}>{text}</p>
              }
              error={(err) => (
                <p style={{ ...styles.messageText, color: '#ef4444' }}>
                  Error: {err?.message ?? 'Unknown error'}
                </p>
              )}
              errorValue={chatState.error ?? null}
            />

            {/* Source URLs */}
            {sourceUrls.length > 0 && (
              <div style={styles.sources}>
                <span style={styles.sourcesLabel}>Sources</span>
                <ul style={styles.sourceList}>
                  {sourceUrls.map((s, i) => (
                    <li key={i}>
                      <a href={s.url} target="_blank" rel="noreferrer" style={styles.sourceLink}>
                        {s.title ?? s.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Status badge */}
        <div style={styles.statusRow}>
          <span style={{ ...styles.statusBadge, ...statusColor(chatState.status) }}>
            {chatState.status}
          </span>
          {isStreamingDebounced && <span style={styles.debouncedNote}>debounced: streaming</span>}
        </div>
      </div>

      {/* Input */}
      <div style={styles.inputRow}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
          style={styles.textarea}
          disabled={chatState.status === 'streaming' || chatState.status === 'submitted'}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || chatState.status === 'streaming' || chatState.status === 'submitted'}
          style={styles.sendBtn}
        >
          Send
        </button>
      </div>
    </div>
  )
}

function statusColor(s: UseChatStatus) {
  const map: Record<UseChatStatus, React.CSSProperties> = {
    ready: { background: '#d1fae5', color: '#065f46' },
    submitted: { background: '#fef3c7', color: '#92400e' },
    streaming: { background: '#dbeafe', color: '#1e40af' },
    error: { background: '#fee2e2', color: '#991b1b' },
  }
  return map[s]
}

const styles: Record<string, React.CSSProperties> = {
  root: { maxWidth: 720, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  header: { marginBottom: 24 },
  title: { margin: '0 0 4px', fontSize: 22, fontWeight: 700 },
  subtitle: { margin: '0 0 12px', color: '#6b7280', fontSize: 14 },
  resetBtn: { padding: '4px 12px', fontSize: 13, cursor: 'pointer', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff' },
  chat: { flex: 1, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 },
  assistantBubble: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 16px' },
  reasoning: { borderLeft: '3px solid #c7d2fe', paddingLeft: 10, marginBottom: 10 },
  reasoningLabel: { fontSize: 11, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' },
  reasoningText: { margin: '4px 0 0', color: '#6b7280', fontSize: 13, lineHeight: 1.6 },
  messageText: { margin: 0, lineHeight: 1.7, color: '#111827' },
  sources: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f4f6' },
  sourcesLabel: { fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' },
  sourceList: { margin: '4px 0 0', paddingLeft: 16 },
  sourceLink: { color: '#3b82f6', fontSize: 13 },
  statusRow: { display: 'flex', alignItems: 'center', gap: 8 },
  statusBadge: { fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20 },
  debouncedNote: { fontSize: 11, color: '#9ca3af' },
  inputRow: { display: 'flex', gap: 8 },
  textarea: { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical', minHeight: 60, fontFamily: 'inherit' },
  sendBtn: { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end' },
}
