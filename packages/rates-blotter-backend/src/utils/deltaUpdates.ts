import { DeltaUpdate } from '../types';
import { Instrument } from '../models/instrument';
import { isEqual } from 'lodash';

/**
 * Generate a delta update object by comparing previous and current states
 * of an instrument
 *
 * @param previousState Previous instrument state
 * @param currentState Current instrument state
 * @returns Delta update object or null if no changes
 */
export function generateDeltaUpdate(
  previousState: Instrument,
  currentState: Instrument
): DeltaUpdate | null {
  if (!previousState || !currentState) {
    return null;
  }

  if (previousState.id !== currentState.id) {
    return null; // Cannot generate delta for different instruments
  }

  const changes: Record<string, any> = {};

  // Compare all fields in the current state
  for (const key in currentState) {
    // Skip the id field
    if (key === 'id') continue;

    // If the field has changed, add it to the changes object
    if (!isEqual(previousState[key], currentState[key])) {
      changes[key] = currentState[key];
    }
  }

  // If no changes were found, return null
  if (Object.keys(changes).length === 0) {
    return null;
  }

  // Return the delta update
  return {
    instrumentId: currentState.id,
    timestamp: Date.now(),
    fields: changes
  };
}

/**
 * Apply a delta update to an instrument
 *
 * @param instrument Instrument to update
 * @param deltaUpdate Delta update to apply
 * @returns Updated instrument
 */
export function applyDeltaUpdate(
  instrument: Instrument,
  deltaUpdate: DeltaUpdate
): Instrument {
  if (!instrument || !deltaUpdate) {
    return instrument;
  }

  if (instrument.id !== deltaUpdate.instrumentId) {
    throw new Error('Cannot apply delta update to different instrument');
  }

  // Create a shallow copy of the instrument
  const updatedInstrument = { ...instrument };

  // Apply each field from the delta update
  for (const key in deltaUpdate.fields) {
    updatedInstrument[key] = deltaUpdate.fields[key];
  }

  return updatedInstrument;
}

/**
 * Batch multiple delta updates into a single update message
 *
 * @param updates Array of delta updates
 * @returns Batch update object
 */
export function batchDeltaUpdates(updates: DeltaUpdate[]): { updates: DeltaUpdate[], timestamp: number } {
  return {
    updates,
    timestamp: Date.now()
  };
}

/**
 * Apply multiple delta updates to a collection of instruments
 *
 * @param instruments Map of instruments by ID
 * @param updates Array of delta updates
 * @returns Updated map of instruments
 */
export function applyBatchDeltaUpdates(
  instruments: Map<string, Instrument>,
  updates: DeltaUpdate[]
): Map<string, Instrument> {
  // Create a new map to avoid mutating the original
  const updatedInstruments = new Map(instruments);

  // Apply each update
  for (const update of updates) {
    const instrument = updatedInstruments.get(update.instrumentId);

    if (instrument) {
      const updatedInstrument = applyDeltaUpdate(instrument, update);
      updatedInstruments.set(update.instrumentId, updatedInstrument);
    }
  }

  return updatedInstruments;
}