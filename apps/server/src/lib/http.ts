import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/** Parses and validates a JSON body, surfacing field-level issues to the client. */
export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError("Request body must be valid JSON", 400);
  }
  try {
    return schema.parse(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HttpError("Validation failed", 422, error.flatten());
    }
    throw error;
  }
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/**
 * Wraps a route handler so thrown errors become clean JSON instead of an
 * HTML stack trace, and so nothing internal leaks on a 500.
 */
export function route<A extends unknown[]>(
  handler: (request: Request, ...args: A) => Promise<Response>,
) {
  return async (request: Request, ...args: A): Promise<Response> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      if (error instanceof HttpError) {
        return fail(error.message, error.status, error.details);
      }
      console.error("[api] unhandled error", error);
      const message = error instanceof Error ? error.message : "Unexpected server error";
      return fail(message, 500);
    }
  };
}

/** Stable identity for anonymous users, used to scope reviews and weak points. */
export function clientKey(request: Request): string {
  return request.headers.get("x-client-key") ?? "anonymous";
}
