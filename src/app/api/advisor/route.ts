import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES } from "@/data/categories";
import { isCategoryId, matchByRules, type AdvisorResult } from "@/lib/advisor";

/**
 * KAAM AI Advisor endpoint.
 *
 * POST { problem: string } → AdvisorResult
 *
 * Uses the Claude API when ANTHROPIC_API_KEY is configured (set it in
 * Vercel → Project → Settings → Environment Variables); otherwise falls
 * back to the built-in keyword matcher so the feature always works.
 */

const CATEGORY_LIST = CATEGORIES.map((c) => `${c.id}: ${c.label} (${c.subServices.join(", ")})`).join("\n");

const OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    categoryId: {
      type: "string",
      enum: CATEGORIES.map((c) => c.id),
      description: "Best-matching KAAM service category id",
    },
    altCategoryId: {
      type: ["string", "null"],
      enum: [...CATEGORIES.map((c) => c.id), null],
      description: "Second-best category if the problem spans two trades, else null",
    },
    urgency: { type: "string", enum: ["low", "medium", "high"] },
    safetyTips: {
      type: "array",
      items: { type: "string" },
      description: "0-3 short, practical safety tips the user should follow right now",
    },
    note: {
      type: "string",
      description: "One friendly sentence explaining the match, in the user's own language",
    },
  },
  required: ["categoryId", "altCategoryId", "urgency", "safetyTips", "note"],
  additionalProperties: false as const,
};

async function askClaude(problem: string): Promise<AdvisorResult | null> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system: `You are the KAAM AI Advisor for Kerala's home-services marketplace. A user describes a problem (in Malayalam, Manglish, or English) and you pick the best service category and give practical safety advice. Reply in the user's language. Available categories:\n${CATEGORY_LIST}`,
    messages: [{ role: "user", content: problem }],
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return null;
  const parsed = JSON.parse(block.text) as {
    categoryId: string;
    altCategoryId: string | null;
    urgency: "low" | "medium" | "high";
    safetyTips: string[];
    note: string;
  };
  if (!isCategoryId(parsed.categoryId)) return null;

  return {
    categoryId: parsed.categoryId,
    altCategoryId:
      parsed.altCategoryId && isCategoryId(parsed.altCategoryId) ? parsed.altCategoryId : undefined,
    urgency: parsed.urgency,
    safetyTips: parsed.safetyTips.slice(0, 3),
    note: parsed.note,
    source: "claude",
  };
}

export async function POST(request: Request) {
  let problem: string;
  try {
    const body = (await request.json()) as { problem?: string };
    problem = (body.problem ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!problem || problem.length > 2000) {
    return Response.json({ error: "Describe your problem in 1-2000 characters" }, { status: 400 });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await askClaude(problem);
      if (result) return Response.json(result);
    } catch (error) {
      // Fall through to the rule-based matcher on any API failure.
      console.error("Advisor: Claude call failed, using rules fallback", error);
    }
  }

  return Response.json(matchByRules(problem));
}
