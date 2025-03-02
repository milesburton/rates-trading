import { describe, it, expect } from 'vitest';
import { createDelta, applyDelta, createDeltaUpdate } from '../src/utils/deltaUpdates';

describe('Delta Updates Utility', () => {
  it('should create an empty delta for identical objects', () => {
    const original = { name: 'John', age: 30, address: { city: 'London' } };
    const updated = { name: 'John', age: 30, address: { city: 'London' } };

    const delta = createDelta(original, updated);

    expect(delta).toEqual({});
  });

  it('should create a delta with only changed primitive values', () => {
    const original = { name: 'John', age: 30, active: true };
    const updated = { name: 'John', age: 31, active: false };

    const delta = createDelta(original, updated);

    expect(delta).toEqual({ age: 31, active: false });
  });

  it('should handle nested objects in delta creation', () => {
    const original = {
      name: 'John',
      address: {
        city: 'London',
        street: 'Oxford St',
        postcode: 'W1'
      }
    };

    const updated = {
      name: 'John',
      address: {
        city: 'London',
        street: 'Baker St',
        postcode: 'W1'
      }
    };

    const delta = createDelta(original, updated);

    expect(delta).toEqual({
      address: {
        street: 'Baker St'
      }
    });
  });

  it('should handle Date objects in delta creation', () => {
    const date1 = new Date('2023-01-01');
    const date2 = new Date('2023-02-01');

    const original = { date: date1 };
    const updated = { date: date2 };

    const delta = createDelta(original, updated);

    expect(delta).toEqual({ date: date2 });
  });

  it('should handle arrays in delta creation', () => {
    const original = { tags: ['a', 'b', 'c'] };
    const updated = { tags: ['a', 'b', 'd'] };

    const delta = createDelta(original, updated);

    expect(delta).toEqual({ tags: ['a', 'b', 'd'] });
  });

  it('should apply delta updates to an object', () => {
    const original = {
      name: 'John',
      age: 30,
      address: {
        city: 'London',
        street: 'Oxford St'
      },
      tags: ['developer']
    };

    const delta = {
      age: 31,
      address: {
        street: 'Baker St'
      },
      tags: ['developer', 'manager']
    };

    const result = applyDelta(original, delta);

    expect(result).toEqual({
      name: 'John',
      age: 31,
      address: {
        city: 'London',
        street: 'Baker St'
      },
      tags: ['developer', 'manager']
    });

    // Original should be unchanged (ensure immutability)
    expect(original.age).toBe(30);
    expect(original.address.street).toBe('Oxford St');
  });

  it('should create a proper DeltaUpdate object', () => {
    const id = 'user123';
    const delta = { name: 'Jane', age: 31 };

    const deltaUpdate = createDeltaUpdate(id, delta);

    expect(deltaUpdate.id).toBe(id);
    expect(deltaUpdate.delta).toEqual(delta);
    expect(deltaUpdate.timestamp).toBeTypeOf('number');
    expect(deltaUpdate.isFullUpdate).toBe(false);

    // Test with isFullUpdate = true
    const fullUpdate = createDeltaUpdate(id, delta, true);
    expect(fullUpdate.isFullUpdate).toBe(true);
  });
});