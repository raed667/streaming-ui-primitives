# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-03-07

Initial release.

### Added

**Hooks**
- `useTokenStream(source)` — consumes any `AsyncIterable<string>` or `ReadableStream<Uint8Array>` and accumulates text, tracking the full streaming lifecycle (`idle → streaming → complete | error`). Exposes `text`, `isStreaming`, `status`, `error`, `abort`, and `reset`.
- `useMessageStream(parts)` — bridges Vercel AI SDK `UIMessage.parts` to `text`, `reasoning`, `hasActiveToolCall`, `hasReasoning`, and `sourceUrls`.
- `useDebouncedStreaming(isStreaming, debounceMs?)` — debounces the streaming boolean to prevent flicker between tokens.
- `useAISDKStatus(chatStatus)` — maps Vercel AI SDK `useChat` status strings to `StreamStatus`.

**Components**
- `<StreamingText>` — renders text that grows token-by-token with an optional blinking cursor (built-in or custom node). Renders as any HTML element via `as` prop. Fully unstyled.
- `<TypingIndicator>` — animated "AI is thinking" indicator with `dots`, `pulse`, and `bar` variants. Inherits color from parent. Fully accessible.
- `<PartialRender>` — renderer-prop component with error boundary for graceful partial-content rendering during streaming.
- `<StreamGuard>` — status-driven render slots (`idle`, `streaming`, `complete`, `error`) for type-safe lifecycle switching.

**Adapters** (`streaming-ui-primitives/adapters`)
- `fromFetchSSE(response, options?)` — converts a raw `fetch` `Response` to `AsyncIterable<string>`. Modes: `auto`, `text`, `sse-text`, `sse-json`, `vercel-ai`.
- `fromOpenAIChatStream(stream)` — wraps OpenAI SDK `chat.completions.stream()`.
- `fromOpenAICompletionStream(stream)` — wraps OpenAI SDK legacy `completions.create({ stream: true })`.
- `fromAnthropicStream(stream)` — wraps Anthropic SDK `messages.stream()`.
- `partsToText(parts, options?)` — extracts plain text from `UIMessage.parts`.
- `hasActiveToolCall(parts)` — returns `true` if any tool invocation is pending.
- `fromUseChatStatus(status)` — maps Vercel AI SDK `useChat` status to `StreamStatus`.

**Infrastructure**
- Dual ESM + CJS build with full `.d.ts` declarations via `vite-plugin-dts`.
- GitHub Actions CI (unit tests, typecheck, E2E via Playwright against built Storybook).
- GitHub Actions OIDC-compliant npm publish on version tags.
- MIT license.
