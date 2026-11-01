// Phase 2 context pruning. Pure string work, no model call.
// Strips blank lines, duplicate lines and boilerplate headers/footers,
// then truncates to a generous cap so a long description cannot
// silently become a huge prompt. The cap is high on purpose: pruning
// here removes waste, it does not summarise away task content.
// Summarisation of old history is a later, human-reviewed step.
export function prunePrompt(text: string, maxChars = 20000): string {
  const seen = new Set<string>();
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => {
    if (!l) return false;
    if (/^(header|footer|navigation|copyright|all rights reserved)/i.test(l)) return false;
    if (seen.has(l)) return false;
    seen.add(l);
    return true;
  });
  const joined = lines.join("\n");
  return joined.length > maxChars ? joined.slice(0, maxChars) + "\n[truncated by Hivlet pruning to save tokens]" : joined;
}
export function pickTopChunks(chunks: string[], query: string, limit = 3): string[] {
  const q = query.toLowerCase().split(/\W+/).filter(Boolean);
  const score = (c: string) => { const t = c.toLowerCase(); return q.reduce((a, w) => a + (t.includes(w) ? 1 : 0), 0); };
  return [...chunks].sort((a, b) => score(b) - score(a)).slice(0, limit);
}
