import { Prisma } from '@prisma/client';

/**
 * Safely extract an object from an unknown value.
 * Returns an empty object if the value is not a plain object.
 */
export function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * Safely extract a trimmed non-empty string from an unknown value.
 * Returns null for non-strings, empty strings, or whitespace-only strings.
 */
export function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Safely extract a string from an unknown value without trimming.
 * Returns null for non-strings.
 */
export function readNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * Safely extract a string from an unknown value and coerce finite numbers.
 * Strings are trimmed and blank strings are rejected.
 */
export function readStringCoerce(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

/**
 * Safely extract a finite number from an unknown value.
 * Returns null for non-numbers or non-finite values (NaN, Infinity).
 */
export function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Filter an unknown value into an array of plain objects.
 * Non-object/non-array items are dropped.
 */
export function readObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    : [];
}

/**
 * Filter an unknown value into an array of non-empty trimmed strings.
 */
export function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

/**
 * Cast a record to Prisma InputJsonObject.
 */
export function toInputJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}
