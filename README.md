# streaming-ui-primitives

Unstyled React primitives for generative/streaming UI patterns — compatible with Vercel AI SDK, Anthropic, OpenAI, and more.

[![npm](https://img.shields.io/npm/v/streaming-ui-primitives)](https://www.npmjs.com/package/streaming-ui-primitives)
[![bundle size](https://img.shields.io/bundlephobia/minzip/streaming-ui-primitives?label=bundle)](https://bundlephobia.com/package/streaming-ui-primitives)
[![license](https://img.shields.io/npm/l/streaming-ui-primitives)](./LICENSE)
[![tests](https://img.shields.io/github/actions/workflow/status/raed-chammam/streaming-ui-primitives/ci.yml?label=tests)](https://github.com/raed-chammam/streaming-ui-primitives/actions)

---

## Install

```bash
npm install streaming-ui-primitives
# or
pnpm add streaming-ui-primitives
# or
yarn add streaming-ui-primitives
```

**Peer dependencies:** React 18+

---

## Quick Start

```tsx
import {
  useTokenStream,
  StreamingText,
  StreamGuard,
} from "streaming-ui-primitives";
import { fromFetchSSE } from "streaming-ui-primitives/adapters";

function ChatMessage() {
  const [stream, setStream] = React.useState<AsyncIterable<string> | null>(
    null,
  );
  const { text, status, error } = useTokenStream(stream);

  async function ask(prompt: string) {
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
    setStream(fromFetchSSE(res));
  }

  return (
    <div>
      <button onClick={() => ask("Hello!")}>Send</button>

      <StreamGuard
        status={status}
        idle={<p>Ask me anything...</p>}
        streaming={<StreamingText content={text} isStreaming cursor />}
        complete={<StreamingText content={text} isStreaming={false} />}
        error={(err) => <p>Error: {err?.message}</p>}
      />
    </div>
  );
}
```

---

## Primitives

### `useTokenStream(source)`

Consumes any token source and accumulates the text, tracking the full streaming lifecycle.

```tsx
import { useTokenStream } from "streaming-ui-primitives";

// source can be AsyncIterable<string>, ReadableStream<Uint8Array>, or null/undefined
const { text, isStreaming, status, error, abort, reset } =
  useTokenStream(source);
```

Pass `null` or `undefined` to keep the hook idle. When `source` changes, the previous stream is automatically aborted.

---

### `useMessageStream(parts)`

Bridges Vercel AI SDK's `UIMessage.parts` array to simple derived values. No runtime dependency on the `ai` package.

```tsx
import { useMessageStream } from "streaming-ui-primitives";

const { messages, status } = useChat({ api: "/api/chat" });
const lastMsg = messages[messages.length - 1];
const { text, reasoning, hasActiveToolCall, hasReasoning, sourceUrls } =
  useMessageStream(lastMsg?.parts ?? []);
```

---

### `useDebouncedStreaming(isStreaming, debounceMs?)`

Debounces `isStreaming` to prevent flicker when a stream pauses briefly between tokens.

```tsx
import { useDebouncedStreaming } from "streaming-ui-primitives";

const { isStreaming } = useTokenStream(source);
const stableStreaming = useDebouncedStreaming(isStreaming, 150); // default: 150ms
```

---

### `useAISDKStatus(chatStatus)`

Maps a Vercel AI SDK `useChat` status string directly to `StreamStatus`.

```tsx
import { useAISDKStatus } from "streaming-ui-primitives";

const { status } = useChat({ api: "/api/chat" });
const streamStatus = useAISDKStatus(status); // 'idle' | 'streaming' | 'complete' | 'error'
```

---

### `<StreamingText>`

Renders text that grows token-by-token. Completely unstyled — no fonts, colors, or layout applied.

```tsx
import { StreamingText } from 'streaming-ui-primitives'

// Blinking cursor while streaming, hidden when complete
<StreamingText content={text} isStreaming={isStreaming} cursor />

// Custom cursor node
<StreamingText content={text} isStreaming={isStreaming} cursor={<span>▋</span>} />

// Render as a <p> instead of the default <span>
<StreamingText content={text} as="p" className="prose" />
```

---

### `<TypingIndicator>`

Animated "AI is thinking" indicator. Inherits `color` from the parent — fits any theme automatically.

```tsx
import { TypingIndicator } from 'streaming-ui-primitives'

// Three bouncing dots (default)
<TypingIndicator visible={isStreaming} />

// Single pulsing circle
<TypingIndicator visible={isStreaming} variant="pulse" />

// Three animated vertical bars
<TypingIndicator visible={isStreaming} variant="bar" />

// Custom accessible label
<TypingIndicator visible={isStreaming} aria-label="Generating response..." />
```

---

### `<PartialRender>`

Gracefully renders partial/incomplete content during streaming. Uses an error boundary to catch parse errors mid-stream and fall back to plain text. Renderer-agnostic — pass any render function.

```tsx
import { PartialRender } from "streaming-ui-primitives";
import { marked } from "marked";

<PartialRender
  content={text}
  isComplete={status === "complete"}
  renderer={(content, isComplete) => (
    <div dangerouslySetInnerHTML={{ __html: marked(content) }} />
  )}
  fallback={<span>Thinking...</span>}
  errorFallback={(err, content) => <pre>{content}</pre>}
/>;
```

---

### `<StreamGuard>`

Status-driven render slots — a type-safe switch/case over stream lifecycle states.

```tsx
import { StreamGuard } from "streaming-ui-primitives";

<StreamGuard
  status={status}
  idle={<p>Ask me anything...</p>}
  streaming={<TypingIndicator visible />}
  complete={<StreamingText content={text} />}
  error={(err) => <p>Something went wrong: {err?.message}</p>}
  errorValue={error}
/>;
```

---

## Adapters

Adapters are in a separate entry point to keep the core bundle lean:

```ts
import {
  fromFetchSSE,
  fromOpenAIChatStream,
  fromAnthropicStream,
  partsToText,
  hasActiveToolCall,
} from "streaming-ui-primitives/adapters";
```

---

### `fromFetchSSE(response, options?)`

Converts a raw `fetch` `Response` body (plain text or Server-Sent Events) into an `AsyncIterable<string>`.

```tsx
// Plain text stream (auto-detected from Content-Type)
const res = await fetch("/api/stream");
const stream = fromFetchSSE(res);

// SSE stream with `data:` prefix (Vercel AI SDK text stream, OpenAI-compatible endpoints)
const res = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify(payload),
});
const stream = fromFetchSSE(res, { mode: "sse-text" });

// SSE stream with JSON payloads — custom dot-path extraction
const stream = fromFetchSSE(res, {
  mode: "sse-json",
  jsonPath: "choices.0.delta.content",
});

// Vercel AI SDK data stream protocol (bare `0:"token"` lines, no `data:` prefix)
const stream = fromFetchSSE(res, { mode: "vercel-ai" });

// Use with useTokenStream inside a component
const [stream, setStream] = useState(null);
const { text } = useTokenStream(stream);

async function send(prompt) {
  const res = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
  setStream(fromFetchSSE(res));
}
```

---

### `fromAnthropicStream(stream)`

Converts an Anthropic SDK `client.messages.stream(...)` result to `AsyncIterable<string>`. Zero runtime dependency — accepts the shape structurally.

```tsx
import Anthropic from "@anthropic-ai/sdk";
import { fromAnthropicStream } from "streaming-ui-primitives/adapters";

const client = new Anthropic();
const stream = client.messages.stream({
  model: "claude-opus-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: prompt }],
});

// Option A — adapter (handles raw Stream<RawMessageStreamEvent>)
const { text } = useTokenStream(fromAnthropicStream(stream));

// Option B — direct (stream.textStream is already AsyncIterable<string>)
const { text } = useTokenStream(stream.textStream);
```

---

### `fromOpenAIChatStream(stream)`

Converts an OpenAI SDK `chat.completions.stream(...)` result to `AsyncIterable<string>`. Zero runtime dependency on the OpenAI SDK — accepts the shape structurally.

```tsx
import OpenAI from "openai";
import { fromOpenAIChatStream } from "streaming-ui-primitives/adapters";

const openai = new OpenAI();
const stream = openai.chat.completions.stream({
  model: "gpt-4o",
  messages: [{ role: "user", content: prompt }],
  stream: true,
});
const tokenStream = fromOpenAIChatStream(stream);

// In a component:
const { text, isStreaming } = useTokenStream(tokenStream);
```

---

### `fromOpenAICompletionStream(stream)`

Same as above but for legacy text completions (`openai.completions.create(..., { stream: true })`).

```tsx
const stream = openai.completions.create({
  model: "gpt-3.5-turbo-instruct",
  prompt,
  stream: true,
});
const tokenStream = fromOpenAICompletionStream(stream);
```

---

### `partsToText(parts, options?)`

Extracts plain text from a Vercel AI SDK `UIMessage.parts` array. Concatenates all `type: 'text'` parts in order.

```tsx
import { partsToText } from "streaming-ui-primitives/adapters";

const { messages } = useChat({ api: "/api/chat" });
const lastMessage = messages[messages.length - 1];
const text = partsToText(lastMessage.parts);

// Include reasoning parts too
const textWithReasoning = partsToText(lastMessage.parts, {
  includeReasoning: true,
});
```

---

### `hasActiveToolCall(parts)`

Returns `true` if any `tool-invocation` part is in a non-result state.

```tsx
import { hasActiveToolCall } from 'streaming-ui-primitives/adapters'

const isToolRunning = hasActiveToolCall(message.parts)
<TypingIndicator visible={isToolRunning} aria-label="Running tool..." />
```

---

### `fromUseChatStatus(status)`

Utility function (also exported from the main entry) that maps a Vercel AI SDK `useChat` status to `StreamStatus`.

```tsx
import { fromUseChatStatus } from "streaming-ui-primitives";

const { status } = useChat({ api: "/api/chat" });
const streamStatus = fromUseChatStatus(status);
// 'submitted' | 'streaming' → 'streaming'
// 'ready'                   → 'complete'
// 'error'                   → 'error'
```

---

## AI SDK Compatibility

| SDK                   | How to connect                                                                                               | Notes                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Vercel AI SDK v4+** | `fromUseChatStatus(status)`, `useMessageStream(message.parts)`, or `fromFetchSSE(res, { mode: 'sse-text' })` | `useChat` status maps via `fromUseChatStatus`; parts are handled by `useMessageStream` / `partsToText`                                |
| **Anthropic SDK**     | Pass `stream.textStream` directly to `useTokenStream()`, or use `fromAnthropicStream(stream)`                | `stream.textStream` is `AsyncIterable<string>` — no adapter needed; `fromAnthropicStream` handles raw `Stream<RawMessageStreamEvent>` |
| **OpenAI SDK v4+**    | `fromOpenAIChatStream(stream)`                                                                               | Wraps `chat.completions.stream()`; use `fromOpenAICompletionStream` for legacy completions                                            |
| **LangChain.js**      | Pass `chain.stream()` directly to `useTokenStream()`                                                         | Any `AsyncIterable<string>` works without an adapter                                                                                  |
| **LlamaIndex.TS**     | Pass `engine.chat({ stream: true })` result directly to `useTokenStream()`                                   | Any `AsyncIterable<string>` works without an adapter                                                                                  |
| **Raw fetch SSE**     | `fromFetchSSE(response)`                                                                                     | Auto-detects plain text vs SSE from `Content-Type`; use `mode` option to force                                                        |

---

## API Reference

### Types

| Export                | Description                                                                     |
| --------------------- | ------------------------------------------------------------------------------- |
| `StreamStatus`        | `'idle' \| 'streaming' \| 'complete' \| 'error'`                                |
| `TokenSource`         | `AsyncIterable<string> \| ReadableStream<Uint8Array> \| ReadableStream<string>` |
| `UIMessagePartCompat` | Structural subset of Vercel AI SDK `UIMessagePart`                              |
| `UIMessageCompat`     | Structural subset of Vercel AI SDK `UIMessage`                                  |
| `UseChatStatus`       | `'submitted' \| 'streaming' \| 'ready' \| 'error'`                              |

---

### `useTokenStream(source)`

| Parameter | Type                               | Description                                                        |
| --------- | ---------------------------------- | ------------------------------------------------------------------ |
| `source`  | `TokenSource \| null \| undefined` | The token source to consume. Pass `null`/`undefined` to stay idle. |

| Return value  | Type            | Description                                                     |
| ------------- | --------------- | --------------------------------------------------------------- |
| `text`        | `string`        | Full accumulated text so far                                    |
| `isStreaming` | `boolean`       | Whether a stream is actively producing tokens                   |
| `status`      | `StreamStatus`  | Full lifecycle status                                           |
| `error`       | `Error \| null` | Error object if status is `'error'`                             |
| `abort`       | `() => void`    | Cancel the stream, preserve accumulated text, status → `'idle'` |
| `reset`       | `() => void`    | Cancel the stream and clear all state back to idle              |

---

### `useMessageStream(parts)`

| Parameter | Type                    | Description                    |
| --------- | ----------------------- | ------------------------------ |
| `parts`   | `UIMessagePartCompat[]` | Parts array from a `UIMessage` |

| Return value        | Type                                     | Description                                          |
| ------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `text`              | `string`                                 | Concatenated text from all `type: 'text'` parts      |
| `reasoning`         | `string`                                 | Concatenated text from all `type: 'reasoning'` parts |
| `hasActiveToolCall` | `boolean`                                | Whether any tool invocation is pending               |
| `hasReasoning`      | `boolean`                                | Whether any reasoning part is present                |
| `sourceUrls`        | `Array<{ url: string; title?: string }>` | All source URLs from `type: 'source-url'` parts      |

---

### `useDebouncedStreaming(isStreaming, debounceMs?)`

| Parameter     | Type      | Default | Description                              |
| ------------- | --------- | ------- | ---------------------------------------- |
| `isStreaming` | `boolean` | —       | Raw streaming boolean                    |
| `debounceMs`  | `number`  | `150`   | Delay before declaring streaming stopped |

Returns `boolean` — the stabilised streaming state.

---

### `useAISDKStatus(chatStatus)`

| Parameter    | Type            | Description                                |
| ------------ | --------------- | ------------------------------------------ |
| `chatStatus` | `UseChatStatus` | Status string from Vercel AI SDK `useChat` |

Returns `StreamStatus`.

---

### `<StreamingText>` props

| Prop          | Type                   | Default  | Description                                                 |
| ------------- | ---------------------- | -------- | ----------------------------------------------------------- |
| `content`     | `string`               | —        | Accumulated text to display                                 |
| `cursor`      | `boolean \| ReactNode` | `false`  | Show a blinking cursor; `true` uses the built-in bar cursor |
| `isStreaming` | `boolean`              | `true`   | Controls cursor visibility                                  |
| `as`          | `ElementType`          | `'span'` | HTML element to render as                                   |
| `className`   | `string`               | —        | CSS class                                                   |
| `style`       | `CSSProperties`        | —        | Inline styles                                               |

---

### `<TypingIndicator>` props

| Prop         | Type                         | Default          | Description                    |
| ------------ | ---------------------------- | ---------------- | ------------------------------ |
| `visible`    | `boolean`                    | —                | Whether the indicator is shown |
| `variant`    | `'dots' \| 'pulse' \| 'bar'` | `'dots'`         | Visual style                   |
| `aria-label` | `string`                     | `'AI is typing'` | Accessible label               |
| `className`  | `string`                     | —                | CSS class                      |
| `style`      | `CSSProperties`              | —                | Inline styles                  |

---

### `<PartialRender>` props

| Prop            | Type                                                          | Default    | Description                                 |
| --------------- | ------------------------------------------------------------- | ---------- | ------------------------------------------- |
| `content`       | `string`                                                      | —          | Potentially partial content string          |
| `renderer`      | `(content: string, isComplete: boolean) => ReactNode`         | —          | Render function called with current content |
| `isComplete`    | `boolean`                                                     | `true`     | Whether the stream has finished             |
| `fallback`      | `ReactNode`                                                   | —          | Shown when `content` is empty               |
| `errorFallback` | `ReactNode \| ((error: Error, content: string) => ReactNode)` | Plain text | Shown when renderer throws                  |
| `className`     | `string`                                                      | —          | CSS class                                   |
| `style`         | `CSSProperties`                                               | —          | Inline styles                               |

---

### `<StreamGuard>` props

| Prop         | Type                                                 | Description                               |
| ------------ | ---------------------------------------------------- | ----------------------------------------- |
| `status`     | `StreamStatus`                                       | Current stream status                     |
| `idle`       | `ReactNode`                                          | Rendered when status is `'idle'`          |
| `streaming`  | `ReactNode`                                          | Rendered when status is `'streaming'`     |
| `complete`   | `ReactNode`                                          | Rendered when status is `'complete'`      |
| `error`      | `ReactNode \| ((error: Error \| null) => ReactNode)` | Rendered when status is `'error'`         |
| `errorValue` | `Error \| null`                                      | Forwarded to `error` when it's a function |

---

### `fromFetchSSE(response, options?)` options

| Option     | Type                                                          | Default                     | Description                                        |
| ---------- | ------------------------------------------------------------- | --------------------------- | -------------------------------------------------- |
| `mode`     | `'auto' \| 'text' \| 'sse-text' \| 'sse-json' \| 'vercel-ai'` | `'auto'`                    | Stream parsing mode. `auto` sniffs `Content-Type`. |
| `jsonPath` | `string`                                                      | `'choices.0.delta.content'` | Dot-path to extract in `sse-json` mode             |

---

### `partsToText(parts, options?)` options

| Option             | Type      | Default | Description                              |
| ------------------ | --------- | ------- | ---------------------------------------- |
| `includeReasoning` | `boolean` | `false` | Whether to include `reasoning` part text |

---

## Examples

Five standalone runnable apps in the [`examples/`](./examples/) folder, each a Vite + React SPA with an Express mock server:

| Folder                                               | SDK              | Patterns                                                                                                                                           |
| ---------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`examples/vercel-ai/`](./examples/vercel-ai/)       | Vercel AI SDK    | `useMessageStream`, `fromUseChatStatus`, `StreamGuard`, `TypingIndicator`, `useDebouncedStreaming`, multi-turn history                             |
| [`examples/anthropic/`](./examples/anthropic/)       | Anthropic SDK    | `fromAnthropicStream`, `StreamingText` with cursor, `abort()`, `StreamGuard` error state                                                           |
| [`examples/openai/`](./examples/openai/)             | OpenAI SDK       | `fromOpenAIChatStream`, `StreamGuard`, abort mid-stream, multi-turn chat                                                                           |
| [`examples/raw-fetch/`](./examples/raw-fetch/)       | None (raw fetch) | `fromFetchSSE` all 4 modes: `auto`, `sse-text`, `vercel-ai`, `sse-json`, `reset()`                                                                 |
| [`examples/kitchen-sink/`](./examples/kitchen-sink/) | None (mock)      | Markdown rendering, custom cursor, TypingIndicator variants, abort vs reset, debounced streaming, reasoning, source URLs, StreamGuard all 4 states |

**To run any example:**

```bash
cd examples/<name>   # e.g. examples/vercel-ai
pnpm install
pnpm dev             # starts Vite on :5173 + Express mock server on :3001
```

Then open [http://localhost:5173](http://localhost:5173). No API key needed — each example ships with a mock server that streams fake tokens. See [`examples/README.md`](./examples/README.md) for details on using real AI SDKs.

---

## Contributing

```bash
# Run unit tests
pnpm test

# Run end-to-end tests (builds Storybook first)
pnpm test:e2e:ci
```
