const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

/**
 * True when the page is deployed but no API URL was baked in at build time —
 * the default localhost fallback cannot work from a hosted origin.
 */
export const apiUnconfigured =
  !import.meta.env.VITE_API_URL &&
  typeof window !== "undefined" &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname);

/**
 * A stable per-browser id. The demo has no login, so this is what scopes
 * flashcard reviews, weak points, upvotes, and alert opt-ins to "you".
 */
export function clientKey(): string {
  const stored = localStorage.getItem("zpl:client-key");
  if (stored) return stored;

  const key = crypto.randomUUID();
  localStorage.setItem("zpl:client-key", key);
  return key;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Client-Key": clientKey(),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(`Cannot reach the API at ${BASE_URL}. Is the server running?`, 0);
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new ApiError(
      (body.error as string) ?? `Request failed (${response.status})`,
      response.status,
      body.details,
    );
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
};

export { BASE_URL };
