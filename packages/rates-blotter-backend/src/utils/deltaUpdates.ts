/**
 * Utilities for handling field-level delta updates for instruments
 */

/**
 * Creates a delta update by comparing an original object with an updated one
 * Returns only the fields that have changed
 *
 * @param original The original object
 * @param updated The updated object
 * @returns An object containing only the changed fields
 */
export function createDelta<T extends Record<string, any>>(
  original: T,
  updated: T
): Partial<T> {
  const delta: Partial<T> = {};
  let hasChanges = false;

  // Compare each field in the updated object with the original
  for (const key in updated) {
    if (Object.prototype.hasOwnProperty.call(updated, key)) {
      // Handle Date objects
      if (updated[key] instanceof Date && original[key] instanceof Date) {
        if (updated[key].getTime() !== original[key].getTime()) {
          delta[key] = updated[key];
          hasChanges = true;
        }
      }
      // Handle arrays by comparing stringified versions (simple approach)
      else if (Array.isArray(updated[key]) && Array.isArray(original[key])) {
        if (JSON.stringify(updated[key]) !== JSON.stringify(original[key])) {
          delta[key] = updated[key];
          hasChanges = true;
        }
      }
      // Handle objects (non-Date) recursively
      else if (
        typeof updated[key] === 'object' &&
        updated[key] !== null &&
        typeof original[key] === 'object' &&
        original[key] !== null &&
        !(updated[key] instanceof Date) &&
        !(original[key] instanceof Date)
      ) {
        const nestedDelta = createDelta(original[key], updated[key]);
        if (Object.keys(nestedDelta).length > 0) {
          delta[key] = nestedDelta;
          hasChanges = true;
        }
      }
      // Handle primitive values
      else if (updated[key] !== original[key]) {
        delta[key] = updated[key];
        hasChanges = true;
      }
    }
  }

  return hasChanges ? delta : {};
}

/**
 * Applies a delta update to an object
 *
 * @param target The object to update
 * @param delta The delta containing changes to apply
 * @returns The updated object
 */
export function applyDelta<T extends Record<string, any>>(
  target: T,
  delta: Partial<T>
): T {
  const result = { ...target };

  for (const key in delta) {
    if (Object.prototype.hasOwnProperty.call(delta, key)) {
      const value = delta[key];

      // Handle nested objects recursively
      if (
        typeof value === 'object' &&
        value !== null &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !(value instanceof Date) &&
        !(result[key] instanceof Date) &&
        !Array.isArray(value) &&
        !Array.isArray(result[key])
      ) {
        result[key] = applyDelta(result[key], value as any);
      } else {
        // Direct assignment for primitives, arrays, and Date objects
        result[key] = value as any;
      }
    }
  }

  return result;
}

/**
 * Type representing a delta update
 */
export interface DeltaUpdate<T> {
  id: string;         // ID of the entity being updated
  delta: Partial<T>;  // Fields that changed
  timestamp: number;  // When the update occurred
  isFullUpdate: boolean; // Whether this is a full update or a delta
}

/**
 * Creates a DeltaUpdate object from a delta
 *
 * @param id ID of the entity being updated
 * @param delta Fields that changed
 * @param isFullUpdate Whether this is a full update or a delta
 * @returns A DeltaUpdate object
 */
export function createDeltaUpdate<T>(
  id: string,
  delta: Partial<T>,
  isFullUpdate = false
): DeltaUpdate<T> {
  return {
    id,
    delta,
    timestamp: Date.now(),
    isFullUpdate
  };
}