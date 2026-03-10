import { describe, it, expect } from 'vitest'
import { fromFetchSSE } from './fromFetchSSE'
import { fromOpenAIChatStream, fromOpenAICompletionStream } from './fromOpenAIStream'
import { fromAnthropicStream } from './fromAnthropicStream'
import { fromAlgoliaAgentStream, fetchAlgoliaAgentStream } from './fromAlgoliaAgentStream'
import { partsToText, hasActiveToolCall } from './partsToText'
import type { UIMessagePartCompat } from '../types'

// ---------------------------------------------------------------------------
// fromFetchSSE
// ---------------------------------------------------------------------------

function makeFetchResponse(body: string, contentType = 'text/plain'): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': contentType },
  })
}

async function collect(iter: AsyncIterable<string>): Promise<string[]> {
  const chunks: string[] = []
  for await (const chunk of iter) chunks.push(chunk)
  return chunks
}

describe('fromFetchSSE', () => {
  it('yields raw text chunks in text mode', async () => {
    const res = makeFetchResponse('Hello world')
    const chunks = await collect(fromFetchSSE(res, { mode: 'text' }))
    expect(chunks.join('')).toBe('Hello world')
  })

  it('parses SSE data lines in sse-text mode', async () => {
    const sseBody = 'data: Hello\n\ndata: World\n\ndata: [DONE]\n\n'
    const res = makeFetchResponse(sseBody, 'text/event-stream')
    const chunks = await collect(fromFetchSSE(res, { mode: 'sse-text' }))
    expect(chunks).toEqual(['Hello', 'World'])
  })

  it('skips SSE comments and empty lines', async () => {
    const sseBody = ': this is a comment\n\ndata: token\n\n'
    const res = makeFetchResponse(sseBody, 'text/event-stream')
    const chunks = await collect(fromFetchSSE(res, { mode: 'sse-text' }))
    expect(chunks).toEqual(['token'])
  })

  it('extracts nested JSON field in sse-json mode', async () => {
    const chunk = JSON.stringify({ choices: [{ delta: { content: 'hi' } }] })
    const sseBody = `data: ${chunk}\n\n`
    const res = makeFetchResponse(sseBody, 'text/event-stream')
    const chunks = await collect(fromFetchSSE(res, { mode: 'sse-json' }))
    expect(chunks).toEqual(['hi'])
  })

  it('auto-detects sse mode from content-type', async () => {
    const sseBody = 'data: auto\n\n'
    const res = makeFetchResponse(sseBody, 'text/event-stream')
    const chunks = await collect(fromFetchSSE(res))
    expect(chunks).toEqual(['auto'])
  })

  it('throws on non-ok response', async () => {
    const res = new Response('Not Found', { status: 404 })
    await expect(collect(fromFetchSSE(res))).rejects.toThrow('HTTP 404')
  })
})

// ---------------------------------------------------------------------------
// fromFetchSSE — vercel-ai mode
// ---------------------------------------------------------------------------

describe('fromFetchSSE — vercel-ai mode', () => {
  it('yields text from 0: lines', async () => {
    const body = '0:"Hello"\n0:" world"\n0:"!"\n'
    const res = makeFetchResponse(body, 'text/plain')
    const chunks = await collect(fromFetchSSE(res, { mode: 'vercel-ai' }))
    expect(chunks).toEqual(['Hello', ' world', '!'])
  })

  it('skips non-0: lines (d:, 2:, e:)', async () => {
    const body = '0:"Hi"\nd:{"finishReason":"stop"}\n2:[]\n'
    const res = makeFetchResponse(body, 'text/plain')
    const chunks = await collect(fromFetchSSE(res, { mode: 'vercel-ai' }))
    expect(chunks).toEqual(['Hi'])
  })

  it('skips empty strings', async () => {
    const body = '0:""\n0:"token"\n'
    const res = makeFetchResponse(body, 'text/plain')
    const chunks = await collect(fromFetchSSE(res, { mode: 'vercel-ai' }))
    expect(chunks).toEqual(['token'])
  })
})

// ---------------------------------------------------------------------------
// fromOpenAIChatStream
// ---------------------------------------------------------------------------

async function* openAIChatChunks(contents: (string | null)[]) {
  for (const content of contents) {
    yield { choices: [{ delta: { content } }] }
  }
}

describe('fromOpenAIChatStream', () => {
  it('extracts content from chat chunks', async () => {
    const chunks = await collect(fromOpenAIChatStream(openAIChatChunks(['Hello', ' ', 'world'])))
    expect(chunks).toEqual(['Hello', ' ', 'world'])
  })

  it('skips null/undefined content chunks', async () => {
    const chunks = await collect(fromOpenAIChatStream(openAIChatChunks([null, 'text', null])))
    expect(chunks).toEqual(['text'])
  })

  it('handles empty stream', async () => {
    const chunks = await collect(fromOpenAIChatStream(openAIChatChunks([])))
    expect(chunks).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// fromOpenAICompletionStream
// ---------------------------------------------------------------------------

async function* openAICompletionChunks(texts: (string | null)[]) {
  for (const text of texts) {
    yield { choices: [{ text }] }
  }
}

describe('fromOpenAICompletionStream', () => {
  it('extracts text from completion chunks', async () => {
    const chunks = await collect(fromOpenAICompletionStream(openAICompletionChunks(['foo', 'bar'])))
    expect(chunks).toEqual(['foo', 'bar'])
  })
})

// ---------------------------------------------------------------------------
// fromAnthropicStream
// ---------------------------------------------------------------------------

interface AnthropicStreamEvent {
  type: string
  delta?: { type?: string; text?: string }
}

async function* anthropicEvents(events: AnthropicStreamEvent[]) {
  for (const event of events) yield event
}

describe('fromAnthropicStream', () => {
  it('yields text from content_block_delta events', async () => {
    const events: AnthropicStreamEvent[] = [
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } },
    ]
    const chunks = await collect(fromAnthropicStream(anthropicEvents(events)))
    expect(chunks).toEqual(['Hello', ' world'])
  })

  it('skips non-text-delta events', async () => {
    const events: AnthropicStreamEvent[] = [
      { type: 'message_start' },
      { type: 'content_block_start' },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'token' } },
      { type: 'message_delta' },
      { type: 'message_stop' },
    ]
    const chunks = await collect(fromAnthropicStream(anthropicEvents(events)))
    expect(chunks).toEqual(['token'])
  })

  it('skips empty text strings', async () => {
    const events: AnthropicStreamEvent[] = [
      { type: 'content_block_delta', delta: { type: 'text_delta', text: '' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'hi' } },
    ]
    const chunks = await collect(fromAnthropicStream(anthropicEvents(events)))
    expect(chunks).toEqual(['hi'])
  })

  it('handles empty stream', async () => {
    const chunks = await collect(fromAnthropicStream(anthropicEvents([])))
    expect(chunks).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// partsToText
// ---------------------------------------------------------------------------

describe('partsToText', () => {
  it('concatenates text parts', () => {
    const parts: UIMessagePartCompat[] = [
      { type: 'text', text: 'Hello' },
      { type: 'text', text: ' world' },
    ]
    expect(partsToText(parts)).toBe('Hello world')
  })

  it('ignores non-text parts by default', () => {
    const parts: UIMessagePartCompat[] = [
      { type: 'reasoning', reasoning: 'thinking' },
      { type: 'text', text: 'result' },
    ]
    expect(partsToText(parts)).toBe('result')
  })

  it('includes reasoning when includeReasoning=true', () => {
    const parts: UIMessagePartCompat[] = [
      { type: 'reasoning', reasoning: 'thinking' },
      { type: 'text', text: 'result' },
    ]
    expect(partsToText(parts, { includeReasoning: true })).toBe('thinkingresult')
  })

  it('returns empty string for empty parts', () => {
    expect(partsToText([])).toBe('')
  })
})

// ---------------------------------------------------------------------------
// fromAlgoliaAgentStream
// ---------------------------------------------------------------------------

describe('fromAlgoliaAgentStream', () => {
  it('yields delta from text-delta events', async () => {
    const body = [
      'data: {"type":"start","messageId":"msg1"}',
      'data: {"type":"text-start","id":"msg1"}',
      'data: {"type":"text-delta","id":"msg1","delta":"Hello"}',
      'data: {"type":"text-delta","id":"msg1","delta":" world"}',
      'data: {"type":"text-end","id":"msg1"}',
      'data: {"type":"finish"}',
      'data: [DONE]',
      '',
    ].join('\n')
    const res = makeFetchResponse(body, 'text/event-stream')
    const chunks = await collect(fromAlgoliaAgentStream(res))
    expect(chunks).toEqual(['Hello', ' world'])
  })

  it('skips non-text-delta events (start, finish, data-suggestions)', async () => {
    const body = [
      'data: {"type":"start"}',
      'data: {"type":"text-delta","delta":"Hi"}',
      'data: {"type":"data-suggestions","data":{}}',
      'data: {"type":"finish"}',
      '',
    ].join('\n')
    const res = makeFetchResponse(body, 'text/event-stream')
    const chunks = await collect(fromAlgoliaAgentStream(res))
    expect(chunks).toEqual(['Hi'])
  })

  it('skips empty delta strings', async () => {
    const body = [
      'data: {"type":"text-delta","delta":""}',
      'data: {"type":"text-delta","delta":"token"}',
      '',
    ].join('\n')
    const res = makeFetchResponse(body, 'text/event-stream')
    const chunks = await collect(fromAlgoliaAgentStream(res))
    expect(chunks).toEqual(['token'])
  })

  it('throws on non-ok HTTP response', async () => {
    const res = new Response('Unauthorized', { status: 401 })
    await expect(collect(fromAlgoliaAgentStream(res))).rejects.toThrow('HTTP 401')
  })
})

// ---------------------------------------------------------------------------
// fetchAlgoliaAgentStream
// ---------------------------------------------------------------------------

describe('fetchAlgoliaAgentStream', () => {
  it('builds the correct URL with query params', async () => {
    let capturedUrl = ''
    const mockFetch = async (url: string | URL | Request): Promise<Response> => {
      capturedUrl = String(url)
      return makeFetchResponse('data: {"type":"text-delta","delta":"ok"}\n', 'text/event-stream')
    }
    await collect(
      fetchAlgoliaAgentStream({
        appId: 'myapp',
        apiKey: 'mykey',
        agentId: 'agent-uuid',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
        stream: true,
        cache: false,
        fetch: mockFetch as typeof globalThis.fetch,
      }),
    )
    expect(capturedUrl).toBe(
      'https://myapp.algolia.net/agent-studio/1/agents/agent-uuid/completions?compatibilityMode=ai-sdk-5&stream=true&cache=false',
    )
  })

  it('sends correct authentication headers', async () => {
    let capturedHeaders: Record<string, string> = {}
    const mockFetch = async (
      _url: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      capturedHeaders = init?.headers as Record<string, string>
      return makeFetchResponse('data: {"type":"text-delta","delta":"ok"}\n', 'text/event-stream')
    }
    await collect(
      fetchAlgoliaAgentStream({
        appId: 'myapp',
        apiKey: 'mykey',
        agentId: 'agent-uuid',
        messages: [],
        fetch: mockFetch as typeof globalThis.fetch,
      }),
    )
    expect(capturedHeaders['X-Algolia-Application-Id']).toBe('MYAPP')
    expect(capturedHeaders['X-Algolia-API-Key']).toBe('mykey')
  })

  it('yields tokens from the streaming response', async () => {
    const body = [
      'data: {"type":"text-delta","delta":"Hello"}',
      'data: {"type":"text-delta","delta":" world"}',
      '',
    ].join('\n')
    const mockFetch = async (): Promise<Response> =>
      makeFetchResponse(body, 'text/event-stream')
    const chunks = await collect(
      fetchAlgoliaAgentStream({
        appId: 'myapp',
        apiKey: 'mykey',
        agentId: 'agent-uuid',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
        fetch: mockFetch as typeof globalThis.fetch,
      }),
    )
    expect(chunks).toEqual(['Hello', ' world'])
  })

  it('throws on HTTP error response', async () => {
    const mockFetch = async (): Promise<Response> =>
      new Response('Forbidden', { status: 403 })
    await expect(
      collect(
        fetchAlgoliaAgentStream({
          appId: 'myapp',
          apiKey: 'mykey',
          agentId: 'agent-uuid',
          messages: [],
          fetch: mockFetch as typeof globalThis.fetch,
        }),
      ),
    ).rejects.toThrow('HTTP 403')
  })
})

// ---------------------------------------------------------------------------
// hasActiveToolCall
// ---------------------------------------------------------------------------

describe('hasActiveToolCall', () => {
  it('returns true when tool-invocation is in call state', () => {
    const parts: UIMessagePartCompat[] = [
      { type: 'tool-invocation', toolCallId: '1', toolName: 'search', state: 'call' },
    ]
    expect(hasActiveToolCall(parts)).toBe(true)
  })

  it('returns false when all tool-invocations are results', () => {
    const parts: UIMessagePartCompat[] = [
      { type: 'tool-invocation', toolCallId: '1', toolName: 'search', state: 'result' },
    ]
    expect(hasActiveToolCall(parts)).toBe(false)
  })

  it('returns false for non-tool parts', () => {
    const parts: UIMessagePartCompat[] = [{ type: 'text', text: 'hi' }]
    expect(hasActiveToolCall(parts)).toBe(false)
  })
})
