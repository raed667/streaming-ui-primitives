# Examples

Standalone runnable Vite + React SPAs demonstrating every pattern in `streaming-ui-primitives`.

Each example uses `file:../../` to consume the local library source — so changes to the library are reflected immediately after reinstalling.

## Examples

| Folder | SDK | Patterns |
|--------|-----|---------|
| [`vercel-ai/`](./vercel-ai/) | Vercel AI SDK | `useMessageStream`, `fromUseChatStatus`, `StreamGuard`, `TypingIndicator`, `useDebouncedStreaming`, multi-turn history |
| [`anthropic/`](./anthropic/) | Anthropic SDK | `fromAnthropicStream`, `StreamingText` with cursor, `abort()`, `StreamGuard` error state |
| [`openai/`](./openai/) | OpenAI SDK | `fromOpenAIChatStream`, `StreamGuard`, abort mid-stream, multi-turn chat |
| [`raw-fetch/`](./raw-fetch/) | None (raw fetch) | `fromFetchSSE` all 4 modes: `auto`, `sse-text`, `vercel-ai`, `sse-json`, `reset()` |
| [`kitchen-sink/`](./kitchen-sink/) | None (mock) | Every pattern: markdown, custom cursor, TypingIndicator variants, abort vs reset, debounced streaming, reasoning, source URLs, StreamGuard all 4 states |

## Running any example

```bash
cd examples/<name>
pnpm install
pnpm dev
```

Then open [http://localhost:5173](http://localhost:5173).

`pnpm dev` starts both the Vite frontend (port 5173) and the Express mock server (port 3001) concurrently.

## Using a real AI SDK (optional)

Each example ships with a mock server that streams fake tokens without any API key. To use the real SDK:

1. Copy `.env.example` to `.env` in the example folder
2. Fill in your API key
3. Set `USE_REAL_SDK=true` in `.env`
4. Restart `pnpm dev`

Comments in `server/index.ts` show exactly where the real SDK call replaces the mock.

## Rebuilding the library

If you change the library source, rebuild it so the examples pick up the changes:

```bash
# From the repo root:
pnpm build

# Then in the example directory (if the dist shape changed):
pnpm install
```
