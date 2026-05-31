"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Square } from "lucide-react";

import type { ChatMessage, ChatRequest } from "@/lib/gateway/types";

type UiMessage = ChatMessage & {
  id: string;
};

type ConsoleError = {
  code: string;
  message: string;
};

const MODELS = ["nesty-flash-1.0", "nesty-combined-1.0", "nesty-pro-1.0"] as const;

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function extractAssistantText(payload: unknown): string {
  const data = payload as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  return String(data?.choices?.[0]?.message?.content || "");
}

function parseErrorPayload(payload: unknown): ConsoleError {
  const envelope = payload as {
    error?: {
      code?: string;
      message?: string;
    };
  };
  return {
    code: String(envelope?.error?.code || "unknown_error"),
    message: String(envelope?.error?.message || "Chat request failed.")
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<(typeof MODELS)[number]>("nesty-combined-1.0");
  const [search, setSearch] = useState<"auto" | "on" | "off">("auto");
  const [tools, setTools] = useState<"auto" | "off">("auto");
  const [store, setStore] = useState(true);
  const [semanticRecall, setSemanticRecall] = useState<"auto" | "on" | "off">("auto");
  const [stream, setStream] = useState(true);
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("1024");
  const [conversationId, setConversationId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ConsoleError | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const hasCredentialError = useMemo(
    () => error?.code === "credentials_not_configured" || error?.code === "invalid_gateway_api_key",
    [error?.code]
  );

  const stopStreaming = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  };

  const updateAssistantContent = (assistantId: string, appendText: string) => {
    if (!appendText) {
      return;
    }
    setMessages((prev) =>
      prev.map((item) => (item.id === assistantId ? { ...item, content: `${item.content}${appendText}` } : item))
    );
  };

  const consumeSseStream = async (response: Response, assistantId: string, signal: AbortSignal) => {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("stream_reader_unavailable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      if (signal.aborted) {
        break;
      }
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const lines = rawEvent.split("\n");
        const dataLines = lines
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim());

        if (dataLines.length > 0) {
          const eventPayload = dataLines.join("\n");
          if (eventPayload === "[DONE]") {
            return;
          }

          try {
            const json = JSON.parse(eventPayload) as {
              error?: { code?: string; message?: string };
              choices?: Array<{ delta?: { content?: string } }>;
            };
            if (json.error) {
              setError({
                code: String(json.error.code || "unknown_error"),
                message: String(json.error.message || "Streaming response failed.")
              });
              return;
            }
            const delta = String(json?.choices?.[0]?.delta?.content || "");
            updateAssistantContent(assistantId, delta);
          } catch {
            // Ignore malformed partial events.
          }
        }

        boundary = buffer.indexOf("\n\n");
      }
    }
  };

  const sendMessage = async () => {
    if (sending) {
      return;
    }
    const text = input.trim();
    if (!text) {
      return;
    }

    setError(null);
    setSending(true);

    const userMessage: UiMessage = {
      id: makeId(),
      role: "user",
      content: text
    };
    const outgoingMessages: ChatMessage[] = [...messages.map(({ role, content }) => ({ role, content })), userMessage];

    const payload: ChatRequest = {
      model,
      messages: outgoingMessages,
      stream,
      search,
      tools,
      store,
      semantic_recall: semanticRecall
    };

    if (conversationId.trim()) {
      payload.conversation_id = conversationId.trim();
    }
    if (temperature.trim()) {
      const value = Number(temperature);
      if (!Number.isNaN(value)) {
        payload.temperature = value;
      }
    }
    if (maxTokens.trim()) {
      const value = Number(maxTokens);
      if (!Number.isNaN(value) && value > 0) {
        payload.max_tokens = Math.floor(value);
      }
    }

    const assistantId = makeId();
    const assistantPlaceholder: UiMessage = {
      id: assistantId,
      role: "assistant",
      content: ""
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const contentType = String(response.headers.get("content-type") || "").toLowerCase();

      if (!response.ok) {
        const payloadError = parseErrorPayload(await response.json());
        setError(payloadError);
        setMessages((prev) => prev.filter((item) => item.id !== assistantId));
        return;
      }

      if (stream && contentType.includes("text/event-stream")) {
        await consumeSseStream(response, assistantId, controller.signal);
      } else {
        const data = await response.json();
        const assistantText = extractAssistantText(data);
        setMessages((prev) =>
          prev.map((item) => (item.id === assistantId ? { ...item, content: assistantText || "(empty response)" } : item))
        );
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        // Keep partial streamed text if any.
      } else {
        setError({
          code: "gateway_unreachable",
          message: "Gateway is unavailable or unreachable from Nesty Console."
        });
        setMessages((prev) => prev.filter((item) => item.id !== assistantId));
      }
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage();
  };

  const handleInputKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await sendMessage();
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">NestyChat Web MVP</h1>
          <p className="text-sm text-slate-300">Protected chat UI that sends requests through server-side Console routes.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p className="font-medium">{error.code}</p>
          <p className="mt-1">{error.message}</p>
          {hasCredentialError ? (
            <p className="mt-2">
              Gateway API key is invalid or expired. If Gateway uses an ephemeral Console key, copy the new key from
              Gateway startup logs and update it in{" "}
              <Link href="/settings/gateway" className="underline underline-offset-2">
                Settings {"->"} Gateway Credentials
              </Link>
              .
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 h-[420px] overflow-y-auto rounded-lg border border-white/10 bg-surface-950/60 p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-400">Start chatting with NestyAI.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <article key={message.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-cyan-200">{message.role}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-100">{message.content || "..."}</p>
                  </article>
                ))}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => void handleInputKeyDown(event)}
              rows={4}
              placeholder="Type your message. Enter to send, Shift+Enter for newline."
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white outline-none ring-cyan-300/40 focus:ring"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
              {stream ? (
                <button
                  type="button"
                  onClick={stopStreaming}
                  disabled={!sending}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <aside className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">Chat Options</h2>

          <label className="block space-y-1 text-sm text-slate-200">
            <span>Model</span>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value as (typeof MODELS)[number])}
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white"
            >
              {MODELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm text-slate-200">
            <span>Search</span>
            <select
              value={search}
              onChange={(event) => setSearch(event.target.value as "auto" | "on" | "off")}
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white"
            >
              <option value="auto">auto</option>
              <option value="on">on</option>
              <option value="off">off</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm text-slate-200">
            <span>Tools</span>
            <select
              value={tools}
              onChange={(event) => setTools(event.target.value as "auto" | "off")}
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white"
            >
              <option value="auto">auto</option>
              <option value="off">off</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm text-slate-200">
            <span>Semantic recall</span>
            <select
              value={semanticRecall}
              onChange={(event) => setSemanticRecall(event.target.value as "auto" | "on" | "off")}
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white"
            >
              <option value="auto">auto</option>
              <option value="on">on</option>
              <option value="off">off</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm text-slate-200">
            <span>Conversation ID (optional)</span>
            <input
              value={conversationId}
              onChange={(event) => setConversationId(event.target.value)}
              placeholder="conv_..."
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="block space-y-1 text-sm text-slate-200">
            <span>Temperature</span>
            <input
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="block space-y-1 text-sm text-slate-200">
            <span>Max tokens</span>
            <input
              value={maxTokens}
              onChange={(event) => setMaxTokens(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-surface-950/70 px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={store}
              onChange={(event) => setStore(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-surface-950/70"
            />
            store conversation
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={stream}
              onChange={(event) => setStream(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-surface-950/70"
            />
            stream response
          </label>
        </aside>
      </div>
    </section>
  );
}
