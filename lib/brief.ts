// Phase 3 brief quality check. Pure, no model call.
// A brief is ready when it has a title, a description of at least
// 20 characters, and a success signal (done, format, result, or
// approved word). Vague = stopped before tokens are spent, not after.
export type BriefCheck = { ready: boolean; missing: string[] };
export function checkBrief(title: string, description: string | null): BriefCheck {
  const missing: string[] = [];
  if (title.trim().length < 5) missing.push("Title is too short");
  if (!description || description.trim().length < 20) missing.push("Description under 20 characters");
  const d = (description ?? "").toLowerCase();
  if (!/(done|format|result|output|approved|success)/.test(d)) missing.push("No success criteria or output format stated");
  return { ready: missing.length === 0, missing };
}
