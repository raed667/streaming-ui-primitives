// ---------------------------------------------------------------------------
// Minimal structural types for Algolia Agent Studio API (ai-sdk-v5 format)
// No runtime dependency on any Algolia package.
// ---------------------------------------------------------------------------

interface AlgoliaTextPart {
  type: 'text'
  text: string
}

interface AlgoliaUserMessage {
  role: 'user'
  parts: AlgoliaTextPart[]
}

interface AlgoliaAssistantMessage {
  role: 'assistant'
  parts: AlgoliaTextPart[]
}

export type AlgoliaMessage = AlgoliaUserMessage | AlgoliaAssistantMessage

interface AlgoliaSearchParameters {
  filters?: string
  attributesToRetrieve?: string[]
  distinct?: boolean | number
  enablePersonalization?: boolean
  personalizationImpact?: number
  userToken?: string
}

interface AlgoliaSearchConfig {
  mcpServers?: Record<string, unknown>
  searchParameters?: Record<string, AlgoliaSearchParameters>
}

export interface AlgoliaAgentStreamOptions {
  /** Algolia Application ID */
  appId: string
  /** Algolia Search API key with `search` ACL */
  apiKey: string
  /** Agent UUID */
  agentId: string
  /** Chat messages in AI SDK v5 format */
  messages: AlgoliaMessage[]
  /** Optional conversation identifier */
  id?: string
  /** Enable response streaming (default: true) */
  stream?: boolean
  /** Use cached responses (default: true) */
  cache?: boolean
  /** Enable conversation memory (default: true) */
  memory?: boolean
  /** Secure user token for personalization */
  secureUserToken?: string
  /** Algolia search parameters and MCP server overrides */
  algolia?: AlgoliaSearchConfig
  /** Custom fetch implementation (useful for testing) */
  fetch?: typeof globalThis.fetch
}

// ---------------------------------------------------------------------------
// Low-level adapter: Response → AsyncIterable<string>
// ---------------------------------------------------------------------------

/**
 * Converts a streaming `fetch` Response from the Algolia Agent Studio
 * completions endpoint into an `AsyncIterable<string>` that yields text tokens.
 *
 * The API streams standard SSE with JSON event objects. Only `text-delta`
 * events are yielded; all other types (start, finish, tool calls, etc.) are
 * skipped. Each chunk has shape: `data: {"type":"text-delta","delta":"token"}`
 *
 * @example
 * const res = await fetch(
 *   `https://${appId}.algolia.net/agent-studio/1/agents/${agentId}/completions?compatibilityMode=ai-sdk-5`,
 *   {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'X-Algolia-Application-Id': appId,
 *       'X-Algolia-API-Key': apiKey,
 *     },
 *     body: JSON.stringify({ messages }),
 *   }
 * )
 * const { text } = useTokenStream(fromAlgoliaAgentStream(res))
 */
export async function* fromAlgoliaAgentStream(response: Response): AsyncIterable<string> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  if (response.body == null) {
    throw new Error('Response body is null')
  }

  const decoder = new TextDecoder()
  const reader = response.body.getReader()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith(':') || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data: ')) continue

        try {
          const parsed = JSON.parse(trimmed.slice(6)) as unknown
          if (
            parsed !== null &&
            typeof parsed === 'object' &&
            (parsed as Record<string, unknown>)['type'] === 'text-delta'
          ) {
            const delta = (parsed as Record<string, unknown>)['delta']
            if (typeof delta === 'string' && delta.length > 0) {
              yield delta
            }
          }
        } catch {
          // ignore malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ---------------------------------------------------------------------------
// High-level helper: credentials + messages → AsyncIterable<string>
// ---------------------------------------------------------------------------

/**
 * Makes a POST request to the Algolia Agent Studio completions endpoint and
 * returns an `AsyncIterable<string>` of text tokens.
 *
 * Handles URL construction, authentication headers, and request body formatting.
 * Uses `compatibilityMode=ai-sdk-5` and streaming by default.
 *
 * @example
 * const stream = fetchAlgoliaAgentStream({
 *   appId: 'MY_APP_ID',
 *   apiKey: 'MY_API_KEY',
 *   agentId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
 *   messages: [{ role: 'user', parts: [{ type: 'text', text: 'Hello!' }] }],
 * })
 * const { text } = useTokenStream(stream)
 */
export async function* fetchAlgoliaAgentStream(
  options: AlgoliaAgentStreamOptions,
): AsyncIterable<string> {
  const {
    appId,
    apiKey,
    agentId,
    messages,
    id,
    stream = true,
    cache,
    memory,
    secureUserToken,
    algolia,
    fetch: fetchImpl = globalThis.fetch,
  } = options

  const params = new URLSearchParams({
    compatibilityMode: 'ai-sdk-5',
    stream: String(stream),
  })
  if (cache !== undefined) params.set('cache', String(cache))
  if (memory !== undefined) params.set('memory', String(memory))

  const url = `https://${appId.toLowerCase()}.algolia.net/agent-studio/1/agents/${agentId}/completions?${params}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Algolia-Application-Id': appId.toUpperCase(),
    'X-Algolia-API-Key': apiKey,
  }
  if (secureUserToken !== undefined) {
    headers['X-Algolia-Secure-User-Token'] = secureUserToken
  }

  const bodyObj: Record<string, unknown> = { messages }
  if (id !== undefined) bodyObj['id'] = id
  if (algolia !== undefined) bodyObj['algolia'] = algolia

  const response = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyObj),
  })

  yield* fromAlgoliaAgentStream(response)
}
