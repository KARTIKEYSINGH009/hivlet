// Compact handoff packets (Piece 2). Pure, no provider call.
// The next agent in a chain receives ONLY this packet, never a full
// transcript. Caps (enforced by compactHandoffPacket):
//   summary: max 3 sentences
//   key facts: max 5
//   total: max 400 tokens, approximated by a character budget.
//
// TOKEN APPROXIMATION, documented: tokenizers vary by provider, so the
// code budgets 4 characters per token (HANDOFF_CHAR_BUDGET = 400 * 4 =
// 1600 chars). This is a conservative character budget, not a measured
// token count: English prose averages ~4 chars/token, so a packet at
// the char budget is at or under 400 tokens in practice. The provider
// reports real token counts per run; this budget only caps what we
// send, it is never reported as a measured token figure.
import type { SupabaseClient } from "@supabase/supabase-js";

export const HANDOFF_TOKEN_CAP = 400;
export const CHARS_PER_TOKEN = 4;
export const HANDOFF_CHAR_BUDGET = HANDOFF_TOKEN_CAP * CHARS_PER_TOKEN;

export type HandoffPacket = {
  summary: string;
  artifacts: string[];
  keyFacts: string[];
  openQuestions: string[];
};

const MAX_SUMMARY_SENTENCES = 3;
const MAX_KEY_FACTS = 5;
const MAX_ARTIFACTS = 5;
const MAX_OPEN_QUESTIONS = 3;

// Rough token estimate for capping only (see note above). Never
// reported as a measured token count.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function firstSentences(text: string, max: number): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.slice(0, max).join(" ");
}

function bulletLines(text: string, max: number): string[] {
  return text
    .split("\n")
    .map((l) => l.trim().replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((l) => l.length > 0 && l.length <= 200)
    .slice(0, max);
}

function questionLines(text: string, max: number): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.endsWith("?"))
    .slice(0, max);
}

// Build a packet from a finished run's output. Deterministic
// extraction only: first sentences for the summary, bullet-like lines
// for key facts, question lines for open questions. Artifacts are
// caller-supplied (filenames / URLs the run produced); an empty list
// is valid and means "no artifacts".
export function buildHandoffPacket(args: {
  output: string;
  artifacts?: string[];
}): HandoffPacket {
  const output = args.output.trim();
  return compactHandoffPacket({
    summary: firstSentences(output, MAX_SUMMARY_SENTENCES),
    artifacts: (args.artifacts ?? []).slice(0, MAX_ARTIFACTS),
    keyFacts: bulletLines(output, MAX_KEY_FACTS),
    openQuestions: questionLines(output, MAX_OPEN_QUESTIONS),
  });
}

// Enforce every cap. Truncation order: drop facts/questions first,
// then shorten the summary, so the summary (the most useful part)
// survives longest. The result always fits HANDOFF_CHAR_BUDGET.
export function compactHandoffPacket(packet: HandoffPacket): HandoffPacket {
  const compact: HandoffPacket = {
    summary: firstSentences(packet.summary, MAX_SUMMARY_SENTENCES),
    artifacts: packet.artifacts.slice(0, MAX_ARTIFACTS),
    keyFacts: packet.keyFacts.slice(0, MAX_KEY_FACTS),
    openQuestions: packet.openQuestions.slice(0, MAX_OPEN_QUESTIONS),
  };
  let rendered = renderHandoffPacket(compact);
  if (rendered.length <= HANDOFF_CHAR_BUDGET) return compact;
  compact.openQuestions = [];
  compact.keyFacts = compact.keyFacts.slice(0, 2);
  rendered = renderHandoffPacket(compact);
  if (rendered.length <= HANDOFF_CHAR_BUDGET) return compact;
  compact.keyFacts = [];
  compact.artifacts = [];
  const budgetForSummary = Math.max(
    0,
    HANDOFF_CHAR_BUDGET - renderHandoffPacket({ ...compact, summary: "" }).length
  );
  compact.summary = compact.summary.slice(0, budgetForSummary).trim();
  return compact;
}

export function renderHandoffPacket(packet: HandoffPacket): string {
  const lines = [`Summary: ${packet.summary}`];
  if (packet.artifacts.length) {
    lines.push(`Artifacts: ${packet.artifacts.join(", ")}`);
  }
  if (packet.keyFacts.length) {
    lines.push(`Key facts:\n${packet.keyFacts.map((f) => `- ${f}`).join("\n")}`);
  }
  if (packet.openQuestions.length) {
    lines.push(`Open questions:\n${packet.openQuestions.map((q) => `- ${q}`).join("\n")}`);
  }
  return lines.join("\n");
}

// ── Storage (migration 011 columns, best-effort) ────────────────────────────
// tasks.handoff_packet / max_hops / retry_count / started_at are added
// by Piece 1's migration 011, which has NOT run live yet. Every read
// and write here degrades gracefully: a missing-column error returns
// null / false and the run continues without the packet. A missing
// column is never a run failure, and no error is thrown to the caller.
export function isMissingColumnError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error ?? "");
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  return (
    code === "PGRST204" ||
    code === "42703" ||
    /column .* does not exist/i.test(msg) ||
    /could not find the .* column/i.test(msg)
  );
}

export async function readTaskHandoff(
  supabase: SupabaseClient,
  taskId: string
): Promise<{ packet: HandoffPacket | null; hopsUsed: number; degraded: boolean }> {
  const { data, error } = await supabase
    .from("tasks")
    .select("handoff_packet, max_hops")
    .eq("id", taskId)
    .single();
  if (error) {
    if (isMissingColumnError(error)) return { packet: null, hopsUsed: 0, degraded: true };
    console.error("readTaskHandoff failed:", error.message);
    return { packet: null, hopsUsed: 0, degraded: false };
  }
  const row = data as { handoff_packet: unknown; max_hops: unknown } | null;
  const raw = row?.handoff_packet;
  const packet =
    raw && typeof raw === "object"
      ? (raw as HandoffPacket)
      : typeof raw === "string"
        ? safeParsePacket(raw)
        : null;
  return {
    packet: packet ? compactHandoffPacket(packet) : null,
    hopsUsed: typeof row?.max_hops === "number" ? row.max_hops : 0,
    degraded: false,
  };
}

function safeParsePacket(raw: string): HandoffPacket | null {
  try {
    const parsed = JSON.parse(raw) as HandoffPacket;
    if (typeof parsed?.summary === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

// Best-effort write. Returns false when the 011 columns are not live
// yet (or the write otherwise fails); the caller never treats that as
// a run failure.
export async function writeTaskHandoff(
  supabase: SupabaseClient,
  taskId: string,
  args: {
    packet: HandoffPacket;
    hopsUsed: number;
    retryCount: number;
    startedAt: string;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from("tasks")
    .update({
      handoff_packet: compactHandoffPacket(args.packet),
      max_hops: args.hopsUsed,
      retry_count: args.retryCount,
      started_at: args.startedAt,
    })
    .eq("id", taskId);
  if (error) {
    if (isMissingColumnError(error)) return false;
    console.error("writeTaskHandoff failed:", error.message);
    return false;
  }
  return true;
}
