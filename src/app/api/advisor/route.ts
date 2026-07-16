import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES } from "@/data/categories";
import { isCategoryId, matchByRules } from "@/lib/advisor";

/**
 * KAAM AI Advisor — a professional, multilingual conversational assistant.
 *
 * POST { messages: {role:"user"|"assistant", content:string}[] }
 *   → { content, categoryId, altCategoryId, urgency, safetyTips, source }
 *
 * Uses the Claude API (claude-opus-4-8) when ANTHROPIC_API_KEY is set
 * (add it in Vercel → Settings → Environment Variables). Claude understands
 * and replies in the user's own language. Without a key it falls back to the
 * built-in keyword matcher (English-oriented), so the feature still works.
 */

const CATEGORY_LIST = CATEGORIES.map(
  (c) => `${c.id}: ${c.label} (${c.subServices.join(", ")})`,
).join("\n");

const SYSTEM_PROMPT = `You are KAAM Assist, the friendly AI helper for KAAM — Kerala's trusted home-services marketplace (electricians, plumbers, nurses, cooks, musicians, baby sitters and more).

Your job: help the customer describe their need, reassure them, and recommend the right KAAM service.

Rules:
- ALWAYS reply in the SAME language and script the customer used (Malayalam, Manglish, English, Hindi, Tamil, Arabic, etc.). Match their tone — warm, respectful, simple. Never switch languages on them.
- Be concise and professional: 1–3 short sentences. No emojis unless the user uses them.
- Put your written reply in the "content" field.
- If the request is clear, recommend one category (set categoryId to its id). If it's unclear, ask ONE short clarifying question and set categoryId to "none".
- For anything urgent or dangerous (sparks, gas leak, flooding, a medical emergency, someone hurt), set urgency "high" and give 1–2 short safety tips. For a real medical emergency, tell them to call 108 first.
- Never invent prices or make promises about specific workers or timings.
- Only recommend from these categories (use the id, or "none"):
${CATEGORY_LIST}`;

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

const OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    content: {
      type: "string",
      description: "Warm, concise reply in the SAME language/script the customer used.",
    },
    categoryId: {
      type: "string",
      enum: [...CATEGORY_IDS, "none"],
      description: "Best-matching category id, or 'none' if a clarifying question is needed.",
    },
    altCategoryId: {
      type: "string",
      enum: [...CATEGORY_IDS, "none"],
      description: "A secondary category id, or 'none'.",
    },
    urgency: { type: "string", enum: ["low", "medium", "high"] },
    safetyTips: {
      type: "array",
      items: { type: "string" },
      description: "0-2 short safety tips in the user's language, only when relevant.",
    },
  },
  required: ["content", "categoryId", "altCategoryId", "urgency", "safetyTips"],
  additionalProperties: false as const,
};

type ChatMessage = { role: "user" | "assistant"; content: string };

interface AdvisorReply {
  content: string;
  categoryId: string | null;
  altCategoryId: string | null;
  urgency: "low" | "medium" | "high";
  safetyTips: string[];
  source: "claude" | "rules";
}

function cleanCategory(value: string | undefined): string | null {
  return value && value !== "none" && isCategoryId(value) ? value : null;
}

async function askClaude(messages: ChatMessage[]): Promise<AdvisorReply | null> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return null;
  const parsed = JSON.parse(block.text) as {
    content: string;
    categoryId?: string;
    altCategoryId?: string;
    urgency: "low" | "medium" | "high";
    safetyTips?: string[];
  };
  return {
    content: parsed.content,
    categoryId: cleanCategory(parsed.categoryId),
    altCategoryId: cleanCategory(parsed.altCategoryId),
    urgency: parsed.urgency,
    safetyTips: (parsed.safetyTips ?? []).slice(0, 2),
    source: "claude",
  };
}

export async function POST(request: Request) {
  let messages: ChatMessage[];
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    messages = (body.messages ?? []).filter(
      (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
    );
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser || !lastUser.content.trim() || lastUser.content.length > 4000) {
    return Response.json({ error: "Say something to the advisor first." }, { status: 400 });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await askClaude(messages);
      if (result) return Response.json(result);
    } catch (error) {
      console.error("Advisor: Claude call failed, using rules fallback", error);
    }
  }

  // Fallback — keyword matcher on the latest message (English-oriented).
  const r = matchByRules(lastUser.content);
  return Response.json({
    content:
      r.categoryId && r.source === "rules"
        ? `It sounds like you need a ${r.categoryId}. I've found matching workers below.`
        : r.note,
    categoryId: r.categoryId,
    altCategoryId: r.altCategoryId ?? null,
    urgency: r.urgency,
    safetyTips: r.safetyTips,
    source: "rules",
  } satisfies AdvisorReply);
}
