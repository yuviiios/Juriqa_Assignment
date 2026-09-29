"use client";

import { useState, useRef, useEffect } from "react";

interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
}

interface Quote {
  text: string;
  verified: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  quotes?: Quote[];
}

interface ChatInterfaceProps {
  document: Document;
  onQuoteClick?: (quote: string) => void;
}

export default function ChatInterface({ document, onQuoteClick }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  async function handleSend() {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setStreamingContent("");
    setLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document.id,
          question: userMessage,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error("Chat request failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let quotes: Quote[] = [];
      let fullContent = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (data.token) {
              fullContent += data.token;
              setStreamingContent((prev) => prev + data.token);
            }

            if (data.done) {
              quotes = data.quotes || [];
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: fullContent,
          quotes,
        },
      ]);
      setStreamingContent("");
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        const errMsg = err instanceof Error ? err.message : "Error";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${errMsg}` },
        ]);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  }

  function handleStop() {
    if (abortController) {
      abortController.abort();
      if (streamingContent) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: streamingContent,
            quotes: [],
          },
        ]);
      }
      setStreamingContent("");
      setLoading(false);
      setAbortController(null);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-lg shadow">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !streamingContent && (
          <div className="text-center text-gray-500 mt-8">
            <p>Ask a question about the document</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx}>
            <div
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-2xl px-4 py-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>

            {msg.quotes && msg.quotes.length > 0 && (
              <div className="mt-2 ml-0 space-y-2">
                {msg.quotes.map((quote, qIdx) => (
                  <button
                    key={qIdx}
                    onClick={() => onQuoteClick?.(quote.text)}
                    className={`w-full text-left text-sm p-3 rounded border-l-4 cursor-pointer hover:opacity-80 transition ${
                      quote.verified
                        ? "bg-green-50 border-green-400 text-green-900"
                        : "bg-yellow-50 border-yellow-400 text-yellow-900"
                    }`}
                  >
                    <div className="font-semibold">
                      {quote.verified ? "✓ Verified" : "⚠ Unverified"}
                    </div>
                    <div className="mt-1 italic">&ldquo;{quote.text}&rdquo;</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-2xl px-4 py-2 rounded-lg bg-gray-100 text-gray-900">
              <div className="whitespace-pre-wrap">{streamingContent}</div>
              <div className="mt-2 animate-pulse">▌</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !loading && handleSend()}
            placeholder="Ask a question..."
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {loading ? (
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
