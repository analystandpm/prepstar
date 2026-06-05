import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

const SYSTEM =
  "You are an expert, honest interview coach. You always return ONLY valid JSON with no markdown fences and no preamble.";

// Calls Claude and parses a JSON response. Throws on bad JSON.
export async function callClaudeJSON(userText) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: "user", content: userText }],
  });

  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(clean);
}
