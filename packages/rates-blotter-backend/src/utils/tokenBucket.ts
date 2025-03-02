/**
 * Token Bucket implementation for rate limiting
 * Used to implement client-side backpressure
 */
export class TokenBucket {
  private capacity: number;       // Maximum number of tokens
  private tokensPerInterval: number; // Tokens added per interval
  private intervalMs: number;     // Interval in milliseconds
  private tokens: number;         // Current token count
  private lastRefillTimestamp: number; // Last time tokens were refilled

  /**
   * Creates a new token bucket for rate limiting
   *
   * @param capacity Maximum number of tokens the bucket can hold
   * @param tokensPerInterval Number of tokens added per interval
   * @param intervalMs Interval in milliseconds for token refill
   */
  constructor(
    capacity: number,
    tokensPerInterval: number,
    intervalMs: number
  ) {
    this.capacity = capacity;
    this.tokensPerInterval = tokensPerInterval;
    this.intervalMs = intervalMs;
    this.tokens = capacity; // Start with a full bucket
    this.lastRefillTimestamp = Date.now();
  }

  /**
   * Refills the token bucket based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefillTimestamp;

    // Calculate how many tokens to add based on elapsed time
    const tokensToAdd = Math.floor(
      (elapsedMs * this.tokensPerInterval) / this.intervalMs
    );

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefillTimestamp = now;
    }
  }

  /**
   * Attempts to consume tokens from the bucket
   *
   * @param count Number of tokens to consume
   * @returns Whether tokens were successfully consumed
   */
  public tryConsume(count: number = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  /**
   * Consumes tokens, waiting if necessary until they become available
   *
   * @param count Number of tokens to consume
   * @returns Promise resolving when tokens are consumed
   */
  public async consume(count: number = 1): Promise<void> {
    if (this.tryConsume(count)) {
      return;
    }

    // Calculate how long to wait for the required tokens
    // This is a simplified approach that doesn't account for partial tokens
    const tokensNeeded = count - this.tokens;
    const waitTimeMs = Math.ceil(
      (tokensNeeded * this.intervalMs) / this.tokensPerInterval
    );

    return new Promise(resolve => {
      setTimeout(() => {
        this.refill();
        this.tokens -= count; // Consume the tokens
        resolve();
      }, waitTimeMs);
    });
  }

  /**
   * Resets the token bucket to its full capacity
   */
  public reset(): void {
    this.tokens = this.capacity;
    this.lastRefillTimestamp = Date.now();
  }

  /**
   * Returns the current number of tokens in the bucket
   */
  public getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Updates the bucket's configuration
   *
   * @param capacity New maximum capacity
   * @param tokensPerInterval New tokens per interval
   * @param intervalMs New interval in ms
   */
  public updateConfiguration(
    capacity?: number,
    tokensPerInterval?: number,
    intervalMs?: number
  ): void {
    // Update capacity and adjust tokens
    if (capacity !== undefined) {
      // If increasing capacity, add the difference to current tokens
      if (capacity > this.capacity) {
        this.tokens += (capacity - this.capacity);
      }
      this.capacity = capacity;
      // If decreasing capacity, ensure tokens don't exceed new capacity
      this.tokens = Math.min(this.tokens, capacity);
    }

    if (tokensPerInterval !== undefined) {
      this.tokensPerInterval = tokensPerInterval;
    }

    if (intervalMs !== undefined) {
      this.intervalMs = intervalMs;
    }
  }
}