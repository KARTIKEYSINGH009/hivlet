// Phase 2 shared memory / duplicate detection. Pure text similarity,
// no model call. A todo task is a reuse candidate when its title shares
// most words with a verified task (done or in_review with a result).
// This only SUGGESTS reuse on the Memory page; it never blocks or
// auto-completes a task, because a similar title is not proof the
// answer is the same.
export function titleSimilarity(a: string, b: string): number {
  const words = (s: string) => new Set(s.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  const A = words(a), B = words(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0; A.forEach((w) => { if (B.has(w)) inter += 1; });
  return inter / Math.max(A.size, B.size);
}
export function findReuseCandidates(todoTitle: string, verified: { id: string; title: string; result: string | null }[]): { id: string; title: string; score: number }[] {
  return verified.map((v) => ({ id: v.id, title: v.title, score: titleSimilarity(todoTitle, v.title) })).filter((c) => c.score >= 0.6).sort((a, b) => b.score - a.score).slice(0, 3);
}
