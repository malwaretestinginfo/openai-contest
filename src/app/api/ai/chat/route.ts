import { NextRequest, NextResponse } from "next/server";
import { verifyApiSecurity } from "@/lib/api-security";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT = `
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
- Never call editor.setText unless the user explicitly asks to insert/replace code.
- For greetings or regular chat (for example "Hi", "Hello"), answer with plain text only.
- No markdown for TOOL_CALL.
- TOOL_CALL must contain exactly one JSON object.

Examples:
TOOL_CALL: {"tool":"editor.setText","args":{"text":"print('hello')"}}
TOOL_CALL: {"tool":"editor.addIntellisense","args":{"label":"print","kind":"Function","detail":"Lua print","insertText":"print($1)"}}

If no tool is needed, answer normally in clear, short sentences.
`.trim();

export async function POST(request: NextRequest) {
  const security = verifyApiSecurity(request);
  if (!security.ok) {
    return NextResponse.json({ error: security.error }, { status: security.status });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY is missing" }, { status: 500 });
  }

  const body = await request.json();
  const messages = Array.isArray(body?.messages) ? body.messages : [];

  const groqResponse = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      temperature: 0.2,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
    })
  });

  if (!groqResponse.ok || !groqResponse.body) {
    const errorText = await groqResponse.text();
    return NextResponse.json(
      { error: "Groq request failed", details: errorText },
      { status: groqResponse.status || 500 }
    );
  }

  return new NextResponse(groqResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
