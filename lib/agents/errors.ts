// Adapter errors. Two rules:
//  1. Error messages are safe to store in task_executions.error and to
//     show in the UI — they must never contain an API key.
//  2. A missing key is a configuration problem, not a provider failure:
//     it fails gracefully with a clear message instead of a stack trace.

export type AdapterErrorCode =
  | "missing_key"
  | "unsupported_provider"
  | "provider_error"
  | "timeout"
  | "invalid_response";

export class AdapterError extends Error {
  code: AdapterErrorCode;

  constructor(code: AdapterErrorCode, message: string) {
    super(sanitizeErrorMessage(message));
    this.name = "AdapterError";
    this.code = code;
  }
}

// Strip anything that looks like an API key before a message is stored or
// logged. Providers' key shapes: sk-... (OpenAI), sk-ant-... (Anthropic),
// AIza... (Google). Belt and braces on top of "never log the key".
export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/sk-[A-Za-z0-9-_]{10,}/g, "[redacted-key]")
    .replace(/sk-ant-[A-Za-z0-9-_]{10,}/g, "[redacted-key]")
    .replace(/AIza[A-Za-z0-9-_]{20,}/g, "[redacted-key]")
    .replace(/gsk_[A-Za-z0-9-_]{10,}/g, "[redacted-key]");
}

// fetch with a timeout that reports as AdapterError('timeout').
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AdapterError(
        "timeout",
        `Provider request timed out after ${timeoutMs}ms`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Read a provider error body without ever echoing secrets into it.
export async function providerErrorMessage(
  res: Response,
  provider: string
): Promise<string> {
  let detail = "";
  try {
    const text = await res.text();
    detail = text.slice(0, 500);
  } catch {
    detail = "";
  }
  return sanitizeErrorMessage(
    `${provider} request failed (${res.status})${detail ? `: ${detail}` : ""}`
  );
}

export function requireKey(
  apiKey: string | undefined,
  provider: string
): string {
  if (!apiKey) {
    throw new AdapterError(
      "missing_key",
      `No API key configured for ${provider}. Set the provider key in ` +
        `server-only environment (see .env.example) — the app never ` +
        `stores keys in the database.`
    );
  }
  return apiKey;
}
