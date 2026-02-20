"use client";

import { FormEvent, useMemo, useState } from "react";
import { getSecurityHeaders } from "@/lib/client-security";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ToolCall = {
  tool: string;
  args: Record<string, unknown>;
};

type ToolRunner = (tool: string, args: Record<string, unknown>) => Promise<string> | string;

type AiAssistantPanelProps = {
  runTool: ToolRunner;
};

type ToolParseResult = {
  toolCall: ToolCall | null;
  visibleText: string;
};

function parseToolCall(text: string): ToolParseResult {
  const marker = /^TOOL_CALL:\s*(\{[\s\S]*\})\s*$/m;
  const match = text.match(marker);

  if (!match) {
    return { toolCall: null, visibleText: text.trim() };
  }

  try {
    const parsed = JSON.parse(match[1]) as Partial<ToolCall>;
    if (typeof parsed.tool === "string" && parsed.args && typeof parsed.args === "object") {
      const visibleText = text.replace(match[0], "").trim();
      return {
        toolCall: { tool: parsed.tool, args: parsed.args as Record<string, unknown> },
        visibleText
      };
    }
  } catch {
    return { toolCall: null, visibleText: text.trim() };
  }

  return { toolCall: null, visibleText: text.trim() };
}

export default function AiAssistantPanel({ runTool }: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [pairMode, setPairMode] = useState(true);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  function shouldExecuteToolCall(userText: string, toolCall: ToolCall) {
    const text = userText.toLowerCase();
    const greetingOnly =
      /^(hi|hello|hey|hallo|servus|moin|yo|guten tag|good morning|good evening)[!. ]*$/i.test(userText.trim());

    if (greetingOnly) {
      return false;
    }

    if (toolCall.tool === "editor.setText") {
      return /(write|generate|create|insert|replace|set|update|build|fix|script|code)/.test(text);
    }

    return true;
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!canSend) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getSecurityHeaders()
        },
        body: JSON.stringify({
          messages: nextMessages,
          mode: pairMode ? "pair" : "chat"
        })
      });

      if (!response.ok || !response.body) {
        const fallback = await response.text();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `AI request failed: ${fallback || response.statusText}` }
        ]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) {
            continue;
          }

          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (!delta) {
              continue;
            }
            assistantText += delta;
          } catch {
            continue;
          }
        }
      }

      const parsedResponse = parseToolCall(assistantText);
      if (!parsedResponse.toolCall) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: parsedResponse.visibleText || "(empty response)" }
        ]);
        return;
      }

      if (!shouldExecuteToolCall(userMessage.content, parsedResponse.toolCall)) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: parsedResponse.visibleText || "I understood your message. No tool call needed."
          }
        ]);
        return;
      }

      const result = await runTool(parsedResponse.toolCall.tool, parsedResponse.toolCall.args);
      const responseText = parsedResponse.visibleText
        ? `${parsedResponse.visibleText}\n\nTool executed: ${parsedResponse.toolCall.tool}\n${result}`
        : `Tool executed: ${parsedResponse.toolCall.tool}\n${result}`;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: responseText
        }
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => [...prev, { role: "assistant", content: `AI error: ${message}` }]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#0a0918]/75 backdrop-blur-2xl">
      <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-[#f1ecff]">
        AI Assistant (gpt-oss-120b)
        <label className="ml-3 inline-flex items-center gap-2 text-[11px] font-normal text-[#b6addb]">
          <input
            checked={pairMode}
            className="accent-[#8f6bff]"
            onChange={(event) => setPairMode(event.target.checked)}
            type="checkbox"
          />
          Pair Mode
        </label>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {messages.length === 0 ? (
          <p className="text-[#9f96c7]">Ask anything or let the assistant run tools.</p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "rounded-xl border border-[#8f6bff]/45 bg-[#7e57f2]/20 p-2.5 text-[#f4f0ff]"
                  : "whitespace-pre-wrap rounded-xl border border-white/10 bg-[#0a0916]/80 p-2.5 text-[#dcd4ff]"
              }
            >
              {message.content}
            </div>
          ))
        )}
      </div>
      <form className="border-t border-white/10 p-3" onSubmit={sendMessage}>
        <textarea
          className="mb-2 h-24 w-full resize-none rounded-xl border border-white/15 bg-[#0a0916]/80 p-3 text-sm text-[#efeaff] outline-none transition-colors focus:border-[#8f6bff]/65"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Message the assistant..."
          value={input}
        />
        <button
          className="w-full rounded-xl border border-[#8f6bff] bg-[#7e57f2] px-3 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(126,87,242,0.4)] hover:bg-[#8a67ff] disabled:opacity-50"
          disabled={!canSend}
          type="submit"
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
