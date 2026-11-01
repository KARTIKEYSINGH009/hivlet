// Phase 3 batch eligibility. Pure, no provider call.
// Non-urgent, repeatable work can wait for a cheaper batch run.
// Urgent and high priority work never qualifies, and neither does
// any task asking to spend, publish, or send (worker never does those).
export function isBatchEligible(title: string, description: string | null, priority: string | null): boolean {
  if (priority === "urgent" || priority === "high") return false;
  const t = `${title} ${description ?? ""}`.toLowerCase();
  if (/(spend|publish|send|payment)/.test(t)) return false;
  return /(nightly|summary|summar|bulk|classif|enrich|report|digest)/.test(t);
}
