import React, { useState } from "react";
import {
  useTokenStream,
  StreamGuard,
  StreamingText,
} from "@raed667/streaming-ui-primitives";
import {
  fromFetchSSE,
  type FetchSSEMode,
} from "@raed667/streaming-ui-primitives/adapters";

interface Props {
  mode: FetchSSEMode;
}

export function ModeDemo({ mode }: Props) {
  const [source, setSource] = useState<AsyncIterable<string> | null>(null);
  const { text, status, error, reset } = useTokenStream(source);

  async function start() {
    reset();
    // Each mode maps to a different endpoint on the mock server
    const res = await fetch(`/api/stream?mode=${mode}`, { method: "POST" });
    setSource(
      mode === "sse-json"
        ? fromFetchSSE(res, {
            mode: "sse-json",
            jsonPath: "choices.0.delta.content",
          })
        : fromFetchSSE(res, { mode }),
    );
  }

  function handleReset() {
    reset(); // cancels stream AND clears text — contrast with abort()
    setSource(null);
  }

  return (
    <div style={styles.card}>
      <div style={styles.codeBlock}>
        <code style={styles.code}>{modeSnippet(mode)}</code>
      </div>

      <StreamGuard
        status={status}
        idle={
          <p style={styles.idle}>
            Click <strong>Stream</strong> to fetch from the mock server using{" "}
            <code>{mode}</code> mode.
          </p>
        }
        streaming={
          <div>
            <StreamingText
              content={text}
              isStreaming
              cursor
              as="p"
              style={styles.output}
            />
            <p style={styles.hint}>
              Streaming… click Reset to cancel and clear.
            </p>
          </div>
        }
        complete={
          <div>
            <p style={styles.output}>{text}</p>
            <p style={styles.hint}>
              Complete. {text.length} characters received.
            </p>
          </div>
        }
        error={(err: Error | null) => (
          <p style={styles.error}>Error: {err?.message ?? "Unknown error"}</p>
        )}
        errorValue={error}
      />

      <div style={styles.actions}>
        <button
          onClick={start}
          disabled={status === "streaming"}
          style={styles.streamBtn}
        >
          {status === "streaming" ? "Streaming…" : "Stream"}
        </button>
        <button onClick={handleReset} style={styles.resetBtn}>
          Reset
        </button>
      </div>

      <p style={styles.footNote}>
        <code>reset()</code> cancels the stream and clears accumulated text. Use{" "}
        <code>abort()</code> to stop without clearing.
      </p>
    </div>
  );
}

function modeSnippet(mode: FetchSSEMode): string {
  const base = `const res = await fetch('/api/stream', { method: 'POST' })\n`;
  if (mode === "sse-json") {
    return (
      base +
      `const stream = fromFetchSSE(res, { mode: 'sse-json', jsonPath: 'choices.0.delta.content' })`
    );
  }
  if (mode === "auto") {
    return (
      base + `const stream = fromFetchSSE(res) // mode: 'auto' is the default`
    );
  }
  return base + `const stream = fromFetchSSE(res, { mode: '${mode}' })`;
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  codeBlock: {
    background: "#1e1e2e",
    borderRadius: 8,
    padding: "10px 14px",
    overflowX: "auto" as const,
  },
  code: {
    color: "#cdd6f4",
    fontSize: 13,
    whiteSpace: "pre" as const,
    fontFamily: "ui-monospace, monospace",
  },
  idle: { margin: 0, color: "#6b7280", fontSize: 14 },
  output: { margin: 0, lineHeight: 1.7, color: "#111827", fontSize: 15 },
  hint: { margin: "4px 0 0", fontSize: 12, color: "#9ca3af" },
  error: { margin: 0, color: "#dc2626", fontSize: 14 },
  actions: { display: "flex", gap: 8 },
  streamBtn: {
    padding: "7px 18px",
    background: "#1d4ed8",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
  },
  resetBtn: {
    padding: "7px 14px",
    background: "#f9fafb",
    color: "#6b7280",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    cursor: "pointer",
  },
  footNote: { margin: 0, fontSize: 12, color: "#9ca3af" },
};
