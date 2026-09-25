import * as z from "zod";

/** A Zod schema describing one of Claude's structured outputs. */
export type OutputSchema<T> = z.ZodType<T>;

/**
 * Converts a schema in this package to the JSON Schema the Messages API takes
 * as `output_format`.
 *
 * This lives beside the schemas rather than in the server because npm installs
 * a separate Zod copy per workspace. Converting here guarantees the schema and
 * the converter are the same instance — `toJSONSchema` from another copy can
 * fail to recognise the schema's internals.
 */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, {
    // The API validates the model's output, which is what `output` describes.
    io: "output",
    reused: "ref",
  }) as Record<string, unknown>;

  return rest;
}

/** Validates a parsed value against a schema, without importing Zod elsewhere. */
export function validateOutput<T>(
  schema: OutputSchema<T>,
  value: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(value);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error.message };
}
