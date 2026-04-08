/**
 * Select Value Utilities
 *
 * Radix/shadcn Select requires non-empty string values for all SelectItem components.
 * These utilities handle the mapping between internal state (which may be undefined/null)
 * and the Select component's required non-empty string values.
 *
 * Usage:
 *   <Select value={toSelectValue(state)} onValueChange={(v) => setState(fromSelectValue(v))}>
 *     <SelectItem value={NONE_VALUE}>None</SelectItem>
 *     ...
 *   </Select>
 */

/** Sentinel value for "none" / "unselected" state */
export const NONE_VALUE = '__none__';

/** Sentinel value for "current" / "default" state (e.g., current configuration) */
export const CURRENT_VALUE = '__current__';

/**
 * Convert internal state value to Select-compatible value.
 * Empty/undefined/null → sentinel, otherwise pass through.
 *
 * @param value - Internal state value (may be undefined, null, or empty string)
 * @param sentinel - Sentinel to use for empty values (default: NONE_VALUE)
 * @returns Non-empty string safe for Select value prop
 */
export function toSelectValue(
  value: string | undefined | null,
  sentinel: string = NONE_VALUE
): string {
  return value || sentinel;
}

/**
 * Convert Select value back to internal state value.
 * Sentinel → undefined, otherwise pass through.
 *
 * @param value - Value from Select onValueChange
 * @param sentinel - Sentinel to check for (default: NONE_VALUE)
 * @returns undefined if sentinel, otherwise the value
 */
export function fromSelectValue(
  value: string,
  sentinel: string = NONE_VALUE
): string | undefined {
  return value === sentinel ? undefined : value;
}

/**
 * Type guard to check if a value is a sentinel.
 */
export function isSentinelValue(value: string): boolean {
  return value === NONE_VALUE || value === CURRENT_VALUE;
}
