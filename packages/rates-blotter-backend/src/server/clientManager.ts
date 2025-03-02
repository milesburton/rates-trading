import { ClientState, ClientSubscription, FilterExpression } from '../types';
import jsonLogic from 'json-logic-js';
import { Instrument } from '../models/instrument';

interface ClientManagerOptions {
  maxUpdatesPerSecond: number;
  bucketSize: number;
}

export class ClientManager {
  private clients: Map<string, ClientState> = new Map();
  private options: ClientManagerOptions;

  constructor(options: ClientManagerOptions) {
    this.options = options;
  }

  /**
   * Register a new client connection
   */
  registerClient(clientId: string): void {
    this.clients.set(clientId, {
      id: clientId,
      subscriptions: new Map(),
      tokenBucket: {
        tokens: this.options.bucketSize,
        lastRefill: Date.now(),
        maxTokens: this.options.bucketSize,
        tokensPerSecond: this.options.maxUpdatesPerSecond
      },
      lastUpdate: new Map()
    });
  }

  /**
   * Unregister a client when they disconnect
   */
  unregisterClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Add a subscription for a client
   */
  addSubscription(clientId: string, subscriptionId: string, subscription: ClientSubscription): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.set(subscriptionId, subscription);
    }
  }

  /**
   * Remove a subscription for a client
   */
  removeSubscription(clientId: string, subscriptionId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(subscriptionId);
    }
  }

  /**
   * Get all clients subscribed to a specific instrument
   */
  getClientsForInstrument(instrumentId: string): ClientState[] {
    const result: ClientState[] = [];

    for (const client of this.clients.values()) {
      for (const subscription of client.subscriptions.values()) {
        if (subscription.instrumentIds.includes(instrumentId)) {
          result.push(client);
          break; // Client is already in the result, no need to check other subscriptions
        }
      }
    }

    return result;
  }

  /**
   * Check if an instrument update passes a client's filter
   */
  passesFilter(instrument: Instrument, filter?: FilterExpression): boolean {
    if (!filter) {
      return true; // No filter means pass everything
    }

    try {
      return jsonLogic.apply(filter, instrument);
    } catch (err) {
      console.error('Error evaluating filter:', err);
      return false; // If filter evaluation fails, don't pass the update
    }
  }

  /**
   * Check if a client has available tokens for an update
   * and consume a token if available
   */
  canSendUpdate(clientId: string, instrumentId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    // Refill tokens based on time elapsed
    const now = Date.now();
    const timeElapsed = (now - client.tokenBucket.lastRefill) / 1000; // in seconds
    const tokensToAdd = timeElapsed * client.tokenBucket.tokensPerSecond;

    if (tokensToAdd > 0) {
      client.tokenBucket.tokens = Math.min(
        client.tokenBucket.maxTokens,
        client.tokenBucket.tokens + tokensToAdd
      );
      client.tokenBucket.lastRefill = now;
    }

    // Check if we have at least one token available
    if (client.tokenBucket.tokens >= 1) {
      client.tokenBucket.tokens -= 1;
      client.lastUpdate.set(instrumentId, now);
      return true;
    }

    return false;
  }

  /**
   * Check if enough time has passed since the last update
   * based on client's update frequency preference
   */
  shouldSendUpdate(clientId: string, instrumentId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    const now = Date.now();
    const lastUpdateTime = client.lastUpdate.get(instrumentId) || 0;

    // Find the subscription with the highest frequency for this instrument
    let minUpdateInterval = Number.MAX_SAFE_INTEGER;

    for (const subscription of client.subscriptions.values()) {
      if (subscription.instrumentIds.includes(instrumentId)) {
        const updateFrequency = subscription.updateFrequency || this.options.maxUpdatesPerSecond;
        const updateInterval = 1000 / updateFrequency; // convert to milliseconds
        minUpdateInterval = Math.min(minUpdateInterval, updateInterval);
      }
    }

    // If we didn't find any subscription, use the default
    if (minUpdateInterval === Number.MAX_SAFE_INTEGER) {
      minUpdateInterval = 1000 / this.options.maxUpdatesPerSecond;
    }

    return (now - lastUpdateTime) >= minUpdateInterval;
  }
}