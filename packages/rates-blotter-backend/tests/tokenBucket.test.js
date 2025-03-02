import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TokenBucket } from '../src/utils/tokenBucket';
describe('TokenBucket', () => {
    let bucket;
    beforeEach(() => {
        // Create a new token bucket with 10 tokens, refilling 1 token per 100ms
        bucket = new TokenBucket(10, 1, 100);
        // Mock timers
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('should initialize with full capacity', () => {
        expect(bucket.getTokens()).toBe(10);
    });
    it('should consume tokens when available', () => {
        expect(bucket.tryConsume(5)).toBe(true);
        expect(bucket.getTokens()).toBe(5);
        expect(bucket.tryConsume(5)).toBe(true);
        expect(bucket.getTokens()).toBe(0);
    });
    it('should not consume tokens when not enough are available', () => {
        expect(bucket.tryConsume(5)).toBe(true);
        expect(bucket.getTokens()).toBe(5);
        expect(bucket.tryConsume(6)).toBe(false);
        expect(bucket.getTokens()).toBe(5); // Tokens remain unchanged
    });
    it('should refill tokens over time', () => {
        // Consume all tokens
        expect(bucket.tryConsume(10)).toBe(true);
        expect(bucket.getTokens()).toBe(0);
        // Advance time by 500ms (should add 5 tokens)
        vi.advanceTimersByTime(500);
        expect(bucket.getTokens()).toBe(5);
        // Advance time by another 500ms (should add 5 more tokens)
        vi.advanceTimersByTime(500);
        expect(bucket.getTokens()).toBe(10);
    });
    it('should not exceed capacity when refilling', () => {
        // Consume 5 tokens
        expect(bucket.tryConsume(5)).toBe(true);
        expect(bucket.getTokens()).toBe(5);
        // Advance time by 1000ms (should try to add 10 tokens)
        vi.advanceTimersByTime(1000);
        // But the capacity is 10, so we should only have 10 tokens
        expect(bucket.getTokens()).toBe(10);
    });
    it('should reset to full capacity', () => {
        // Consume all tokens
        expect(bucket.tryConsume(10)).toBe(true);
        expect(bucket.getTokens()).toBe(0);
        // Reset the bucket
        bucket.reset();
        expect(bucket.getTokens()).toBe(10);
    });
    it('should update its configuration', () => {
        // Consume 5 tokens
        expect(bucket.tryConsume(5)).toBe(true);
        expect(bucket.getTokens()).toBe(5);
        // Update the capacity to 20 (should add 10 more tokens)
        bucket.updateConfiguration(20);
        // Tokens should now be 15 (original 5 + 10 new from capacity increase)
        expect(bucket.getTokens()).toBe(15);
        // Consume 10 more tokens (should now be possible with the increased capacity)
        expect(bucket.tryConsume(10)).toBe(true);
        expect(bucket.getTokens()).toBe(5); // (15 - 10 = 5)
        // Update tokens per interval to 2
        bucket.updateConfiguration(undefined, 2);
        // Advance time by 500ms (should add 10 tokens with new rate)
        vi.advanceTimersByTime(500);
        expect(bucket.getTokens()).toBe(15);
        // Update interval to 200ms
        bucket.updateConfiguration(undefined, undefined, 200);
        // Consume all tokens
        expect(bucket.tryConsume(15)).toBe(true);
        expect(bucket.getTokens()).toBe(0);
        // Advance time by 200ms (should add 2 tokens with new interval)
        vi.advanceTimersByTime(200);
        expect(bucket.getTokens()).toBe(2);
    });
    it('should wait for tokens when using consume()', async () => {
        // Consume all tokens
        expect(bucket.tryConsume(10)).toBe(true);
        expect(bucket.getTokens()).toBe(0);
        // Start consuming 5 tokens (will have to wait)
        const consumePromise = bucket.consume(5);
        // Advance time by 500ms (should add 5 tokens)
        await vi.advanceTimersByTimeAsync(500);
        // Promise should resolve
        await consumePromise;
        // Bucket should have 0 tokens again (5 were added, then 5 consumed)
        expect(bucket.getTokens()).toBe(0);
    });
});
