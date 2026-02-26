import { DeltaUpdate } from '../types';
import { Instrument } from '../models/instrument';
import { isEqual } from 'lodash';

/**
 * Generate a delta update object by comparing previous and current states
 * of an instrument
 */
export function generateDeltaUpdate(
  previousState: Instrument,
  currentState: Instrument
): DeltaUpdate | null {
  if (!previousState || !currentState) {
    return null;
  }

  if (previousState.instrumentId !== currentState.instrumentId) {
    return null;
  }

  const changes: Record<string, unknown> = {};
  const prev = previousState as unknown as Record<string, unknown>;
  const curr = currentState as unknown as Record<string, unknown>;

  for (const key in curr) {
    if (key === 'instrumentId') continue;
    if (!isEqual(prev[key], curr[key])) {
      changes[key] = curr[key];
    }
  }

  if (Object.keys(changes).length === 0) {
    return null;
  }

  return {
    instrumentId: currentState.instrumentId,
    timestamp: Date.now(),
    fields: changes,
  };
}

/**
 * Apply a delta update to an instrument
 */
export function applyDeltaUpdate(
  instrument: Instrument,
  deltaUpdate: DeltaUpdate
): Instrument {
  if (!instrument || !deltaUpdate) {
    return instrument;
  }

  if (instrument.instrumentId !== deltaUpdate.instrumentId) {
    throw new Error('Cannot apply delta update to different instrument');
  }

  return { ...instrument, ...deltaUpdate.fields };
}

/**
 * Batch multiple delta updates into a single update message
 */
export function batchDeltaUpdates(updates: DeltaUpdate[]): { updates: DeltaUpdate[]; timestamp: number } {
  return {
    updates,
    timestamp: Date.now(),
  };
}

/**
 * Apply multiple delta updates to a collection of instruments
 */
export function applyBatchDeltaUpdates(
  instruments: Map<string, Instrument>,
  updates: DeltaUpdate[]
): Map<string, Instrument> {
  const updatedInstruments = new Map(instruments);

  for (const update of updates) {
    const instrument = updatedInstruments.get(update.instrumentId);
    if (instrument) {
      updatedInstruments.set(update.instrumentId, applyDeltaUpdate(instrument, update));
    }
  }

  return updatedInstruments;
}
