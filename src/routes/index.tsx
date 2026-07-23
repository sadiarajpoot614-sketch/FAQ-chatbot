import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { findBestMatch } from "@/lib/faq-matcher";
import { FAQS } from "@/lib/faq-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FAQ Chatbot — Instant Answers" },
      {
        name: "description",
        content:
          "Ask a question and get instant answers from our FAQ knowledge base, powered by NLP and cosine similarity.",
      },
      { property: "og:title", content: "FAQ Chatbot — Instant Answers" },
      {
        property: "og:description",
        content:
          "Ask a question and get instant answers matched from FAQs using NLP and TF-IDF cosine similarity.",
      },
    ],
  }),
  component: Index,
});

type Msg = {
  id: string;
  role: "user" | "bot";
  text: string;
  matched?: { question: string; score: number };
};

const MATCH_THRESHOLD = 0.15;

function Index() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Hi! I'm your FAQ assistant. Ask me anything about orders, shipping, returns, payments, and more.",
    },
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text: trimmed };

    const match = findBestMatch(trimmed);
    let botMsg: Msg;
    if (!match || match.score < MATCH_THRESHOLD) {
      botMsg = {
        id: crypto.randomUUID(),
        role: "bot",
        text:
          "I couldn't find a confident match for that. Try rephrasing, or pick one of the suggested questions below.",
      };
    } else {
      botMsg = {
        id: crypto.randomUUID(),
        role: "bot",
        text: match.faq.answer,
        matched: { question: match.faq.question, score: match.score },
      };
    }

    setMessages((m) => [...m, userMsg, botMsg]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const suggestions = FAQS.slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold shadow-sm">
              F
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                FAQ Chatbot
              </h1>
              <p className="text-sm text-muted-foreground">
                NLP-powered answers · TF-IDF cosine similarity
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {m.matched && (
                    <div className="mb-2 text-xs opacity-70">
                      Matched: "{m.matched.question}" · {(m.matched.score * 100).toFixed(0)}%
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              </div>
            ))}
          </div>

          {messages.length <= 1 && (
            <div className="border-t border-border bg-muted/30 p-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Try asking
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.question}
                    onClick={() => send(s.question)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {s.question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-border bg-background p-4"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {FAQS.length} FAQs indexed · Preprocessing: tokenize, stopword removal, stemming
        </p>
      </div>
    </div>
  );
}
