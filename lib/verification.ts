// Deterministic pre-flight gate for agent output, before in_review.
//
// What this is: pure, synchronous, dependency-free validation that runs
// on an agent's output BEFORE a human is asked to review it. No LLM
// call, no re-run, no network. It checks the shape of the output only:
// required fields, artifact links, output length, and JSON validity,
// with a cheap repair path for broken JSON (trailing commas, unbalanced
// braces) that never re-runs the agent.
//
// Why no zod here: zod is NOT a dependency of this repo (see
// package.json), and adding a dependency + lockfile change in parallel
// with Pieces 1 and 2 risks a merge conflict at build time. So the gate
// is implemented dependency-free, but with the same result shape zod
// callers expect ({ ok, issues, repaired, repairedOutput }), so the
// schemas below can be re-implemented on real zod later without changing
// any caller. Do not add a zod import here until the dependency exists.
//
// Where it is wired in (review flow, not the worker run path):
//   * app/workspace/[id]/approvals/page.tsx — edited action payloads
//     are validated (and JSON-repaired) before they are saved.
//   * app/workspace/[id]/reports/page.tsx — a report must pass
//     verifyReportContent before it can be verified.
//   * app/workspace/[id]/tasks/page.tsx — an in_review task's result is
//     shown with its gate verdict, so the reviewer sees failures.
//   * Worker side (Piece 2 owns lib/execution.ts): call
//     verifyAgentOutput on result.output inside processClaimedExecution
//     BEFORE the task moves to in_review. A failed gate should keep the
//     task out of review (fail it, or retry cheaply), never silently
//     promote broken output. This module intentionally does NOT import
//     lib/execution.ts, so the worker path cannot break on this file.

export type VerificationIssue = {
  field: string;
  code:
    | "empty"
    | "too_long"
    | "too_short"
    | "invalid_json"
    | "missing_field"
    | "missing_artifact_link"
    | "wrong_type";
  message: string;
};

export type VerificationResult = {
  ok: boolean;
  issues: VerificationIssue[];
  /** True only when the cheap JSON repair path fixed broken JSON. */
  repaired: boolean;
  /** The repaired JSON string, when repaired is true. */
  repairedOutput: string | null;
  checkedAt: string;
};

export const MAX_OUTPUT_CHARS = 50_000;
export const MAX_REPORT_FIELD_CHARS = 5_000;
export const MAX_COMPLETED_TASK_CHARS = 500;

function result(
  issues: VerificationIssue[],
  repaired = false,
  repairedOutput: string | null = null
): VerificationResult {
  return {
    ok: issues.length === 0,
    issues,
    repaired,
    repairedOutput,
    checkedAt: new Date().toISOString(),
  };
}

// ── Cheap JSON repair ────────────────────────────────────────────────────────
// Only for broken JSON. Fixes the two most common agent mistakes:
// trailing commas before } or ], and unbalanced closing braces/brackets.
// It never invents content, never calls an LLM, and never re-runs the
// agent. If repair fails, the output stays invalid and the gate fails.
export function tryRepairJson(raw: string): string | null {
  let s = raw.trim();
  // Strip markdown code fences agents sometimes wrap JSON in.
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  // Trailing commas: {"a": 1,} -> {"a": 1}
  let repaired = s.replace(/,\s*([}\]])/g, "$1");
  // Unbalanced closers: append what is missing, at most 10 levels.
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const ch of repaired) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inString) return null; // unterminated string: do not guess
  while (stack.length > 0 && stack.length <= 10) {
    repaired += stack.pop();
  }
  if (stack.length > 10) return null;
  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
}

function parseJsonLenient(raw: string): {
  value: unknown;
  repaired: boolean;
  repairedOutput: string | null;
} {
  try {
    return { value: JSON.parse(raw), repaired: false, repairedOutput: null };
  } catch {
    const repaired = tryRepairJson(raw);
    if (repaired === null) {
      return { value: undefined, repaired: false, repairedOutput: null };
    }
    try {
      return {
        value: JSON.parse(repaired),
        repaired: true,
        repairedOutput: repaired,
      };
    } catch {
      return { value: undefined, repaired: false, repairedOutput: null };
    }
  }
}

// ── Agent output gate ────────────────────────────────────────────────────────
// Call with the raw output string. Options:
//   expectJson: output must be JSON (object). Broken JSON goes through
//     the cheap repair path; unrepairable JSON fails the gate.
//   requiredFields: when the (parsed) output is an object, these keys
//     must be present and non-empty.
//   requireArtifactLinks: output must contain at least one http(s) URL,
//     i.e. the agent actually linked an artifact instead of only
//     describing one.
//   maxChars: output length cap (default MAX_OUTPUT_CHARS).
export function verifyAgentOutput(
  output: string | null | undefined,
  opts: {
    expectJson?: boolean;
    requiredFields?: string[];
    requireArtifactLinks?: boolean;
    maxChars?: number;
  } = {}
): VerificationResult {
  const issues: VerificationIssue[] = [];
  const text = typeof output === "string" ? output : "";
  if (!text.trim()) {
    return result([
      {
        field: "output",
        code: "empty",
        message: "Agent output is empty.",
      },
    ]);
  }
  const maxChars = opts.maxChars ?? MAX_OUTPUT_CHARS;
  if (text.length > maxChars) {
    issues.push({
      field: "output",
      code: "too_long",
      message: `Output is ${text.length.toLocaleString()} characters, over the ${maxChars.toLocaleString()}-character cap.`,
    });
  }

  const looksJson =
    opts.expectJson ??
    (text.trimStart().startsWith("{") || text.trimStart().startsWith("["));
  let repaired = false;
  let repairedOutput: string | null = null;
  if (looksJson) {
    const parsed = parseJsonLenient(text.trim());
    if (parsed.value === undefined) {
      issues.push({
        field: "output",
        code: "invalid_json",
        message:
          "Output looks like JSON but does not parse, and the cheap repair path could not fix it.",
      });
    } else {
      repaired = parsed.repaired;
      repairedOutput = parsed.repairedOutput;
      if (
        opts.requiredFields &&
        opts.requiredFields.length > 0 &&
        parsed.value !== null &&
        typeof parsed.value === "object" &&
        !Array.isArray(parsed.value)
      ) {
        for (const field of opts.requiredFields) {
          const v = (parsed.value as Record<string, unknown>)[field];
          if (
            v === undefined ||
            v === null ||
            (typeof v === "string" && !v.trim()) ||
            (Array.isArray(v) && v.length === 0)
          ) {
            issues.push({
              field,
              code: "missing_field",
              message: `Required field "${field}" is missing or empty.`,
            });
          }
        }
      } else if (opts.requiredFields && opts.requiredFields.length > 0) {
        issues.push({
          field: "output",
          code: "wrong_type",
          message: "Output must be a JSON object with the required fields.",
        });
      }
    }
  } else if (opts.requiredFields && opts.requiredFields.length > 0) {
    // Plain-text output cannot carry structured required fields.
    issues.push({
      field: "output",
      code: "wrong_type",
      message: "Output must be JSON carrying the required fields.",
    });
  }

  if (opts.requireArtifactLinks && !/https?:\/\/\S+/.test(text)) {
    issues.push({
      field: "output",
      code: "missing_artifact_link",
      message:
        "No artifact link found: output must link at least one artifact (http(s) URL).",
    });
  }

  return result(issues, repaired, repairedOutput);
}

// ── Action payload gate (approvals) ──────────────────────────────────────────
// An approval payload must be a JSON object. Broken JSON goes through the
// same cheap repair path; anything else fails and the edit is rejected.
export function verifyActionPayload(raw: string): {
  ok: boolean;
  payload: Record<string, unknown> | null;
  repaired: boolean;
  issues: VerificationIssue[];
} {
  if (!raw.trim()) {
    return {
      ok: false,
      payload: null,
      repaired: false,
      issues: [
        {
          field: "payload",
          code: "empty",
          message: "Payload is empty: paste the exact JSON payload.",
        },
      ],
    };
  }
  const parsed = parseJsonLenient(raw);
  if (parsed.value === undefined) {
    return {
      ok: false,
      payload: null,
      repaired: false,
      issues: [
        {
          field: "payload",
          code: "invalid_json",
          message:
            "Payload is not valid JSON, and the cheap repair path could not fix it.",
        },
      ],
    };
  }
  if (
    parsed.value === null ||
    typeof parsed.value !== "object" ||
    Array.isArray(parsed.value)
  ) {
    return {
      ok: false,
      payload: null,
      repaired: parsed.repaired,
      issues: [
        {
          field: "payload",
          code: "wrong_type",
          message: "Payload must be a JSON object, not an array or a bare value.",
        },
      ],
    };
  }
  return {
    ok: true,
    payload: parsed.value as Record<string, unknown>,
    repaired: parsed.repaired,
    issues: [],
  };
}

// ── Report gate ──────────────────────────────────────────────────────────────
// A daily report must have a non-empty summary and sane field lengths
// before a human verifies it. Completed tasks are checked per line.
export function verifyReportContent(input: {
  summary: string;
  completedTasks: string[];
  blockers?: string | null;
  nextSteps?: string | null;
}): VerificationResult {
  const issues: VerificationIssue[] = [];
  const summary = (input.summary ?? "").trim();
  if (!summary) {
    issues.push({
      field: "summary",
      code: "empty",
      message: "Report summary is empty.",
    });
  } else if (summary.length > MAX_REPORT_FIELD_CHARS) {
    issues.push({
      field: "summary",
      code: "too_long",
      message: `Summary is ${summary.length.toLocaleString()} characters, over the ${MAX_REPORT_FIELD_CHARS.toLocaleString()}-character cap.`,
    });
  }
  for (const t of input.completedTasks ?? []) {
    if (t.length > MAX_COMPLETED_TASK_CHARS) {
      issues.push({
        field: "completed_tasks",
        code: "too_long",
        message: `A completed-task line is ${t.length} characters, over the ${MAX_COMPLETED_TASK_CHARS}-character cap.`,
      });
      break;
    }
  }
  for (const [field, value] of [
    ["blockers", input.blockers],
    ["next_steps", input.nextSteps],
  ] as const) {
    if (value && value.length > MAX_REPORT_FIELD_CHARS) {
      issues.push({
        field,
        code: "too_long",
        message: `${field} is ${value.length.toLocaleString()} characters, over the ${MAX_REPORT_FIELD_CHARS.toLocaleString()}-character cap.`,
      });
    }
  }
  return result(issues);
}

// ── Webhook URL gate (settings) ──────────────────────────────────────────────
// A configured approval webhook must be an https URL (http is allowed
// only for localhost, for local testing). Anything else is rejected
// before it is saved.
export function isValidWebhookUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol === "https:") return true;
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
