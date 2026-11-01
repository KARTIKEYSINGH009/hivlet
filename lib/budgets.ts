// Phase 2 budgets. Pure check, no charge, no provider call.
// usedTokens/cost are real totals from task_executions (usage page).
// Returns: allowed, alert at 80%, hard stop at 100% when hardStop is on.
// A budget of 0/null means no budget set, so the run is allowed.
export type BudgetCheck = { allowed: boolean; alert80: boolean; hardStop: boolean; pct: number | null; reason: string };
export function checkBudget(args: { budgetTokens: number | null; budgetCostUsd: number | null; usedTokens: number; usedCostUsd: number; hardStop: boolean }): BudgetCheck {
  const tokenPct = args.budgetTokens && args.budgetTokens > 0 ? (args.usedTokens / args.budgetTokens) * 100 : null;
  const costPct = args.budgetCostUsd && args.budgetCostUsd > 0 ? (args.usedCostUsd / args.budgetCostUsd) * 100 : null;
  const pct = Math.max(tokenPct ?? 0, costPct ?? 0);
  const hasBudget = tokenPct !== null || costPct !== null;
  const alert80 = hasBudget && pct >= 80;
  const hardStop = hasBudget && args.hardStop && pct >= 100;
  return { allowed: !hardStop, alert80, hardStop, pct: hasBudget ? pct : null, reason: hardStop ? "Budget exceeded: run blocked before any provider call." : alert80 ? "Budget at or over 80%: run allowed, founder should review." : "Within budget." };
}
