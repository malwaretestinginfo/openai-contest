import { NextRequest, NextResponse } from "next/server";
import { verifyApiSecurity } from "@/lib/api-security";

const DEFAULT_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
function normalizeModel(model: string) {
  const trimmed = model.trim();
  if (trimmed === "gpt-oss-120b") {
    return "openai/gpt-oss-120b";
  }
  return trimmed;
}

const MODEL = normalizeModel(process.env.AI_MODEL || "openai/gpt-oss-120b");
const CHAT_COMPLETIONS_URL = process.env.AI_CHAT_COMPLETIONS_URL || DEFAULT_CHAT_COMPLETIONS_URL;

const BASE_SYSTEM_PROMPT = `
You are a senior AI assistant for a pair-programming app.
You are allowed to use tools directly, but only when truly necessary.

Available tools:
- editor.getText: Read current editor content.
- editor.setText: Replace the full editor content.
- editor.addIntellisense: Add a Monaco completion item.
- tools.list: List available tools.

When a tool is needed, output exactly one line in this format:
TOOL_CALL: {"tool":"editor.getText","args":{}}

IMPORTANT:
- Never output TOOL_CALL for normal conversation.
- If the user explicitly asks to place or replace code inside the editor, use editor.setText.
- Never return raw code blocks instead of editor.setText in such cases.
- For greetings or regular chat (for example "Hi", "Hello"), answer with plain text only.
- No markdown for TOOL_CALL.
- TOOL_CALL must contain exactly one JSON object.

Examples:
TOOL_CALL: {"tool":"editor.setText","args":{"text":"print('hello')"}}
TOOL_CALL: {"tool":"editor.addIntellisense","args":{"label":"print","kind":"Function","detail":"Lua print","insertText":"print($1)"}}

If no tool is needed, answer normally in clear, short sentences.
`.trim();

function toSse(text: string) {
  const chunk = JSON.stringify({
    choices: [{ delta: { content: text } }]
  });
  const body = `data: ${chunk}\n\ndata: [DONE]\n\n`;
  return body;
}

export async function POST(request: NextRequest) {
  const security = verifyApiSecurity(request);
  if (!security.ok) {
    return NextResponse.json({ error: security.error }, { status: security.status });
  }

  const apiKey = process.env.AI_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI_API_KEY (or GROQ_API_KEY) is missing" }, { status: 500 });
  }

  const body = await request.json();
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const mode = body?.mode === "pair" ? "pair" : "chat";
  const modePrompt =
    mode === "pair"
      ? "Pair mode is enabled. You may call tools if that produces a better pair-programming outcome."
      : "Chat mode is enabled. Avoid tool calls unless the user explicitly requests an editor/tool action.";
  const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${modePrompt}`;

  const providerResponse = await fetch(CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      temperature: 0.2,
      messages: [{ role: "system", content: systemPrompt }, ...messages]
    })
  });

  if (!providerResponse.ok) {
    const errorText = await providerResponse.text();
    return NextResponse.json(
      { error: "AI provider request failed", details: errorText },
      { status: providerResponse.status || 500 }
    );
  }

  const providerJson = (await providerResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const finalContent = providerJson.choices?.[0]?.message?.content ?? "";

  return new NextResponse(toSse(finalContent), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
