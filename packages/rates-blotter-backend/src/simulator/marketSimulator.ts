import { produce } from 'immer';
import {
  RatesInstrument,
  SecurityType,
  TradingStatus,
  Bond,
  InterestRateSwap,
  InterestRateFuture,
  InterestRateOption
} from '../models';

/**
 * Market scenario types that the simulator can generate
 */
export enum MarketScenario {
  NORMAL = 'normal',
  HIGH_VOLATILITY = 'highVolatility',
  FLASH_EVENT = 'flashEvent',
  TRENDING_UP = 'trendingUp',
  TRENDING_DOWN = 'trendingDown',
}

/**
 * Time of day effects that influence market behavior
 */
export enum TimeOfDay {
  MARKET_OPEN = 'marketOpen',    // Higher volatility, higher volume
  MORNING = 'morning',           // Normal trading
  LUNCH = 'lunch',               // Lower volume
  AFTERNOON = 'afternoon',       // Normal trading
  MARKET_CLOSE = 'marketClose',  // Higher volatility, higher volume
  AFTER_HOURS = 'afterHours',    // Lower volume, wider spreads
}

/**
 * Configuration options for the market simulator
 */
export interface MarketSimulatorConfig {
  updateFrequencyMs: number;      // Base update frequency in milliseconds
  volatilityFactor: number;       // 0-1 scaling factor for volatility
  correlationStrength: number;    // 0-1 strength of correlations between instruments
  scenario: MarketScenario;       // Current market scenario
  timeOfDay: TimeOfDay;           // Current time of day
  flashEventProbability: number;  // Probability of flash events (0-1)
  flashEventMagnitude: number;    // Magnitude of flash events (multiplier)
}

/**
 * Default configuration for normal market conditions
 */
export const DEFAULT_CONFIG: MarketSimulatorConfig = {
  updateFrequencyMs: 500,
  volatilityFactor: 0.2,
  correlationStrength: 0.7,
  scenario: MarketScenario.NORMAL,
  timeOfDay: TimeOfDay.MORNING,
  flashEventProbability: 0.001,
  flashEventMagnitude: 3.0,
};

/**
 * Callback type for instrument updates
 */
export type InstrumentUpdateCallback = (
  instrumentId: string,
  updatedFields: Partial<RatesInstrument>,
  isFullUpdate: boolean
) => void;

/**
 * Market simulator for generating realistic market data
 * Simulates price movements, trading activity, and market conditions
 */
export class MarketSimulator {
  private instruments: Map<string, RatesInstrument> = new Map();
  private config: MarketSimulatorConfig;
  private updateCallbacks: InstrumentUpdateCallback[] = [];
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private correlationMatrix: Map<string, Map<string, number>> = new Map();

  constructor(config: MarketSimulatorConfig = DEFAULT_CONFIG) {
    this.config = { ...config };
    this.setupCorrelationMatrix();
  }

  /**
   * Get all instruments currently in the simulator
   */
  public getAllInstruments(): RatesInstrument[] {
    return Array.from(this.instruments.values());
  }

  /**
   * Get a specific instrument by ID
   */
  public getInstrument(id: string): RatesInstrument | undefined {
    return this.instruments.get(id);
  }

  /**
   * Add a new instrument to the simulator
   */
  public addInstrument(instrument: RatesInstrument): void {
    this.instruments.set(instrument.instrumentId, instrument);
    this.setupInstrumentUpdates(instrument.instrumentId);
    this.updateCorrelationMatrix(instrument.instrumentId);

    // Notify subscribers of the new instrument
    this.notifyUpdateCallbacks(instrument.instrumentId, instrument, true);
  }

  /**
   * Remove an instrument from the simulator
   */
  public removeInstrument(id: string): void {
    if (this.instruments.has(id)) {
      this.instruments.delete(id);
      this.stopInstrumentUpdates(id);

      // Remove from correlation matrix
      this.correlationMatrix.delete(id);
      this.correlationMatrix.forEach(correlations => {
        correlations.delete(id);
      });
    }
  }

  /**
   * Subscribe to instrument updates
   */
  public subscribeToUpdates(callback: InstrumentUpdateCallback): () => void {
    this.updateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Update simulator configuration
   */
  public updateConfig(config: Partial<MarketSimulatorConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart all instrument updates with new configuration
    this.instruments.forEach((_, id) => {
      this.stopInstrumentUpdates(id);
      this.setupInstrumentUpdates(id);
    });
  }

  /**
   * Start the simulator
   */
  public start(): void {
    this.instruments.forEach((_, id) => {
      this.setupInstrumentUpdates(id);
    });
  }

  /**
   * Stop the simulator
   */
  public stop(): void {
    this.instruments.forEach((_, id) => {
      this.stopInstrumentUpdates(id);
    });
  }

  /**
   * Generate a market update for a specific instrument
   * Returns the updated fields only (delta)
   */
  private generateMarketUpdate(id: string): Partial<RatesInstrument> {
    const instrument = this.instruments.get(id);
    if (!instrument) return {};

    // Calculate volatility based on configuration and time of day
    let volatility = this.config.volatilityFactor;
    if (this.config.timeOfDay === TimeOfDay.MARKET_OPEN ||
        this.config.timeOfDay === TimeOfDay.MARKET_CLOSE) {
      volatility *= 2;
    } else if (this.config.timeOfDay === TimeOfDay.LUNCH) {
      volatility *= 0.5;
    }

    // Adjust volatility based on market scenario
    if (this.config.scenario === MarketScenario.HIGH_VOLATILITY) {
      volatility *= 3;
    } else if (this.config.scenario === MarketScenario.TRENDING_UP ||
               this.config.scenario === MarketScenario.TRENDING_DOWN) {
      volatility *= 1.5;
    }

    // Check for flash event
    const isFlashEvent = Math.random() < this.config.flashEventProbability;
    if (isFlashEvent) {
      volatility *= this.config.flashEventMagnitude;
    }

    // Base price movement (random walk with drift)
    let priceDelta = (Math.random() - 0.5) * volatility;

    // Add trend if in trending scenario
    if (this.config.scenario === MarketScenario.TRENDING_UP) {
      priceDelta += 0.1 * volatility;
    } else if (this.config.scenario === MarketScenario.TRENDING_DOWN) {
      priceDelta -= 0.1 * volatility;
    }

    // Apply correlated movements from other instruments
    priceDelta += this.calculateCorrelatedMovement(id);

    // Create update based on instrument type
    switch (instrument.securityType) {
      case SecurityType.BOND:
        return this.generateBondUpdate(instrument as Bond, priceDelta);
      case SecurityType.SWAP:
        return this.generateSwapUpdate(instrument as InterestRateSwap, priceDelta);
      case SecurityType.FUTURE:
        return this.generateFutureUpdate(instrument as InterestRateFuture, priceDelta);
      case SecurityType.OPTION:
        return this.generateOptionUpdate(instrument as InterestRateOption, priceDelta);
      default:
        return {};
    }
  }

  /**
   * Generate updates specific to bonds
   */
  private generateBondUpdate(bond: Bond, priceDelta: number): Partial<Bond> {
    // Calculate new price (apply small random variation to price)
    const newPrice = Math.max(0.1, bond.price * (1 + priceDelta / 100));

    // Calculate new yield (inverse relationship to price)
    // This is simplified - in reality would use proper bond math
    const yieldDelta = -priceDelta * 1.2; // Inverse and amplified relationship
    const newYield = Math.max(0.01, bond.yield + yieldDelta / 100);

    // Calculate bid-ask spread based on volatility
    const spreadFactor = Math.max(0.5, 1 + Math.abs(priceDelta) * 2);
    const bidAskSpread = 0.05 * spreadFactor;

    // Calculate bid and ask prices
    const bidPrice = newPrice * (1 - bidAskSpread / 200);
    const askPrice = newPrice * (1 + bidAskSpread / 200);

    // Calculate bid and ask yields (inverse to prices)
    const bidYield = newYield * (1 + bidAskSpread / 200);
    const askYield = newYield * (1 - bidAskSpread / 200);

    // Calculate changes
    const prevPrice = bond.price;
    const changeFromPrevClose = newPrice - prevPrice;
    const percentageChange = (changeFromPrevClose / prevPrice) * 100;

    // Generate potential trade
    const tradeOccurred = Math.random() < 0.1; // 10% chance of trade per update
    const lastTradePrice = tradeOccurred ?
      newPrice * (1 + (Math.random() - 0.5) * 0.001) : bond.lastTradePrice;
    const lastTradeSize = tradeOccurred ?
      Math.floor(Math.random() * 9 + 1) * 1000000 : bond.lastTradeSize; // 1-10M
    const lastTradeTime = tradeOccurred ? new Date() : bond.lastTradeTime;

    // Generate sensitivity metrics (simplified)
    const duration = bond.duration * (1 + (Math.random() - 0.5) * 0.01);
    const convexity = bond.convexity * (1 + (Math.random() - 0.5) * 0.005);
    const dv01 = bond.dv01 * (1 + (Math.random() - 0.5) * 0.01);

    // Generates spread metrics (simplified)
    const spread = bond.spread * (1 + (Math.random() - 0.5) * 0.02);
    const zSpread = bond.zSpread * (1 + (Math.random() - 0.5) * 0.02);
    const oasSpread = bond.oasSpread * (1 + (Math.random() - 0.5) * 0.02);

    return {
      price: newPrice,
      yield: newYield,
      bidPrice,
      askPrice,
      bidYield,
      askYield,
      changeFromPrevClose,
      percentageChange,
      lastTradePrice: tradeOccurred ? lastTradePrice : undefined,
      lastTradeSize: tradeOccurred ? lastTradeSize : undefined,
      lastTradeTime: tradeOccurred ? lastTradeTime : undefined,
      duration,
      convexity,
      dv01,
      spread,
      zSpread,
      oasSpread,
      lastUpdate: new Date()
    };
  }

  /**
   * Generate updates specific to swaps
   */
  private generateSwapUpdate(swap: InterestRateSwap, priceDelta: number): Partial<InterestRateSwap> {
    // For swaps, the "price" movement affects the swap rate
    const swapRateDelta = priceDelta / 100; // Convert to basis points
    const newSwapRate = Math.max(0.001, swap.swapRate + swapRateDelta);

    // Calculate spread
    const spreadFactor = Math.max(0.5, 1 + Math.abs(priceDelta) * 2);
    const bidAskSpread = 0.02 * spreadFactor; // Tighter than bonds typically

    // Calculate bid and ask rates
    const bidPrice = newSwapRate * (1 - bidAskSpread / 200);
    const askPrice = newSwapRate * (1 + bidAskSpread / 200);

    // Calculate DV01 changes
    const fixedLegDV01 = swap.fixedLegDV01 * (1 + (Math.random() - 0.5) * 0.01);
    const floatingLegDV01 = swap.floatingLegDV01 * (1 + (Math.random() - 0.5) * 0.02);

    // Generate potential trade
    const tradeOccurred = Math.random() < 0.05; // 5% chance of trade per update
    const lastTradePrice = tradeOccurred ?
      newSwapRate * (1 + (Math.random() - 0.5) * 0.0005) : swap.lastTradePrice;
    const lastTradeSize = tradeOccurred ?
      Math.floor(Math.random() * 19 + 1) * 5000000 : swap.lastTradeSize; // 5-100M
    const lastTradeTime = tradeOccurred ? new Date() : swap.lastTradeTime;

    // Calculate changes
    const prevRate = swap.swapRate;
    const changeFromPrevClose = newSwapRate - prevRate;
    const percentageChange = (changeFromPrevClose / prevRate) * 100;

    return {
      swapRate: newSwapRate,
      bidPrice,
      askPrice,
      fixedLegDV01,
      floatingLegDV01,
      changeFromPrevClose,
      percentageChange,
      lastTradePrice: tradeOccurred ? lastTradePrice : undefined,
      lastTradeSize: tradeOccurred ? lastTradeSize : undefined,
      lastTradeTime: tradeOccurred ? lastTradeTime : undefined,
      duration: swap.duration * (1 + (Math.random() - 0.5) * 0.01),
      dv01: swap.dv01 * (1 + (Math.random() - 0.5) * 0.01),
      lastUpdate: new Date()
    };
  }

  /**
   * Generate updates specific to futures
   */
  private generateFutureUpdate(future: InterestRateFuture, priceDelta: number): Partial<InterestRateFuture> {
    // For futures, calculate price changes
    const newPrice = Math.max(0.01, future.lastTradePrice * (1 + priceDelta / 100));

    // Calculate implied rate (inverse to price for many interest rate futures)
    const newImpliedRate = 100 - newPrice; // Simplified - e.g., for Eurodollar futures

    // Calculate spread
    const spreadFactor = Math.max(0.5, 1 + Math.abs(priceDelta));
    const bidAskSpread = 0.01 * spreadFactor; // Very tight for futures

    // Calculate bid and ask prices
    const bidPrice = newPrice * (1 - bidAskSpread / 200);
    const askPrice = newPrice * (1 + bidAskSpread / 200);

    // Generate potential trade - futures trade frequently
    const tradeOccurred = Math.random() < 0.2; // 20% chance of trade per update
    const lastTradePrice = tradeOccurred ?
      newPrice * (1 + (Math.random() - 0.5) * 0.0002) : future.lastTradePrice;
    const lastTradeSize = tradeOccurred ?
      Math.floor(Math.random() * 49 + 1) * 100000 : future.lastTradeSize; // 1-50 contracts
    const lastTradeTime = tradeOccurred ? new Date() : future.lastTradeTime;

    // Calculate open interest changes
    const openInterestChange = Math.floor((Math.random() - 0.45) * 100); // Slight upward bias
    const newOpenInterest = Math.max(0, future.openInterest + openInterestChange);

    // Calculate changes
    const prevPrice = future.lastTradePrice;
    const changeFromPrevClose = lastTradePrice - prevPrice;
    const percentageChange = (changeFromPrevClose / prevPrice) * 100;

    // Calculate basis to spot
    const basisToSpot = future.basisToSpot * (1 + (Math.random() - 0.5) * 0.03);

    return {
      bidPrice,
      askPrice,
      impliedRate: newImpliedRate,
      openInterest: newOpenInterest,
      basisToSpot,
      changeFromPrevClose,
      percentageChange,
      lastTradePrice: tradeOccurred ? lastTradePrice : undefined,
      lastTradeSize: tradeOccurred ? lastTradeSize : undefined,
      lastTradeTime: tradeOccurred ? lastTradeTime : undefined,
      duration: future.duration * (1 + (Math.random() - 0.5) * 0.005),
      dv01: future.dv01 * (1 + (Math.random() - 0.5) * 0.005),
      lastUpdate: new Date()
    };
  }

  /**
   * Generate updates specific to options
   */
  private generateOptionUpdate(option: InterestRateOption, priceDelta: number): Partial<InterestRateOption> {
    // For options, adjust price based on underlying and volatility
    const underlyingPriceDelta = priceDelta;

    // Calculate new premium based on underlying movement and greeks
    // This is a simplified model - real options would use Black-Scholes or similar
    const deltaPnL = option.delta * underlyingPriceDelta;
    const gammaPnL = 0.5 * option.gamma * underlyingPriceDelta * underlyingPriceDelta;
    const thetaPnL = -option.theta / 365; // Daily theta

    // Total P&L impact
    const totalPnL = deltaPnL + gammaPnL + thetaPnL;

    // New premium
    const premiumChange = totalPnL * option.lastTradePrice / 100;
    const newPremium = Math.max(0.001, option.premium + premiumChange);

    // Calculate implied volatility changes
    const volChange = (Math.random() - 0.5) * 0.01; // Small random changes in vol
    const newImpliedVol = Math.max(0.01, option.impliedVol + volChange);

    // Calculate bid-ask spread based on liquidity
    const spreadFactor = Math.max(0.5, 1 + Math.abs(priceDelta) * 3);
    const bidAskSpread = 0.1 * spreadFactor; // Wider for options

    // Calculate bid and ask prices
    const bidPrice = newPremium * (1 - bidAskSpread / 200);
    const askPrice = newPremium * (1 + bidAskSpread / 200);

    // Generate potential trade
    const tradeOccurred = Math.random() < 0.05; // 5% chance of trade per update
    const lastTradePrice = tradeOccurred ?
      newPremium * (1 + (Math.random() - 0.5) * 0.002) : option.lastTradePrice;
    const lastTradeSize = tradeOccurred ?
      Math.floor(Math.random() * 19 + 1) * 1000000 : option.lastTradeSize; // 1-20M
    const lastTradeTime = tradeOccurred ? new Date() : option.lastTradeTime;

    // Calculate intrinsic and time value
    const underlyingPrice = this.getUnderlyingPrice(option.underlyingId);
    const intrinsicValue = this.calculateIntrinsicValue(
      option.optionType,
      underlyingPrice,
      option.strikePrice
    );
    const timeValue = Math.max(0, newPremium - intrinsicValue);

    // Update greeks
    const newDelta = this.adjustGreek(option.delta, 0.01);
    const newGamma = this.adjustGreek(option.gamma, 0.005);
    const newTheta = this.adjustGreek(option.theta, 0.02);
    const newVega = this.adjustGreek(option.vega, 0.01);
    const newRho = this.adjustGreek(option.rho, 0.005);

    // Calculate changes
    const prevPremium = option.premium;
    const changeFromPrevClose = newPremium - prevPremium;
    const percentageChange = (changeFromPrevClose / prevPremium) * 100;

    return {
      premium: newPremium,
      impliedVol: newImpliedVol,
      bidPrice,
      askPrice,
      delta: newDelta,
      gamma: newGamma,
      theta: newTheta,
      vega: newVega,
      rho: newRho,
      intrinsicValue,
      timeValue,
      changeFromPrevClose,
      percentageChange,
      lastTradePrice: tradeOccurred ? lastTradePrice : undefined,
      lastTradeSize: tradeOccurred ? lastTradeSize : undefined,
      lastTradeTime: tradeOccurred ? lastTradeTime : undefined,
      lastUpdate: new Date()
    };
  }

  /**
   * Helper method to adjust option greeks
   */
  private adjustGreek(greek: number, maxChange: number): number {
    return greek * (1 + (Math.random() - 0.5) * maxChange);
  }

  /**
   * Helper method to get underlying price for an option
   */
  private getUnderlyingPrice(underlyingId: string): number {
    const underlying = this.instruments.get(underlyingId);
    if (!underlying) return 100; // Default if not found

    return underlying.lastTradePrice;
  }

  /**
   * Helper method to calculate intrinsic value of an option
   */
  private calculateIntrinsicValue(
    optionType: 'Call' | 'Put',
    underlyingPrice: number,
    strikePrice: number
  ): number {
    if (optionType === 'Call') {
      return Math.max(0, underlyingPrice - strikePrice);
    } else {
      return Math.max(0, strikePrice - underlyingPrice);
    }
  }

  /**
   * Set up periodic updates for an instrument
   */
  private setupInstrumentUpdates(id: string): void {
    // Clear any existing update interval
    this.stopInstrumentUpdates(id);

    // Set up new update interval
    const interval = setInterval(() => {
      this.updateInstrument(id);
    }, this.config.updateFrequencyMs);

    this.updateIntervals.set(id, interval);
  }

  /**
   * Stop periodic updates for an instrument
   */
  private stopInstrumentUpdates(id: string): void {
    const interval = this.updateIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(id);
    }
  }

  /**
   * Update an instrument with new market data
   */
  private updateInstrument(id: string): void {
    const instrument = this.instruments.get(id);
    if (!instrument) return;

    // Generate update
    const update = this.generateMarketUpdate(id);

    // Apply update to instrument using Immer for immutability
    this.instruments.set(id, produce(instrument, draft => {
      Object.assign(draft, update);
    }));

    // Notify subscribers
    this.notifyUpdateCallbacks(id, update, false);
  }

  /**
   * Notify subscribers of an instrument update
   */
  private notifyUpdateCallbacks(
    id: string,
    update: Partial<RatesInstrument>,
    isFullUpdate: boolean
  ): void {
    this.updateCallbacks.forEach(callback => {
      callback(id, update, isFullUpdate);
    });
  }

  /**
   * Set up the correlation matrix between instruments
   */
  private setupCorrelationMatrix(): void {
    // Clear existing matrix
    this.correlationMatrix.clear();

    // Initialize matrix for existing instruments
    this.instruments.forEach((_, id1) => {
      if (!this.correlationMatrix.has(id1)) {
        this.correlationMatrix.set(id1, new Map());
      }

      this.instruments.forEach((_, id2) => {
        if (id1 !== id2) {
          this.correlationMatrix.get(id1)?.set(
            id2,
            this.generateCorrelation(id1, id2)
          );
        }
      });
    });
  }

  /**
   * Update correlation matrix when adding a new instrument
   */
  private updateCorrelationMatrix(newId: string): void {
    // Initialize correlations for the new instrument
    this.correlationMatrix.set(newId, new Map());

    // Set correlations with existing instruments
    this.instruments.forEach((_, id) => {
      if (id !== newId) {
        const correlation = this.generateCorrelation(newId, id);

        // Set bidirectional correlation
        this.correlationMatrix.get(newId)?.set(id, correlation);

        if (!this.correlationMatrix.has(id)) {
          this.correlationMatrix.set(id, new Map());
        }

        this.correlationMatrix.get(id)?.set(newId, correlation);
      }
    });
  }

  /**
   * Generate a correlation coefficient between two instruments
   */
  private generateCorrelation(id1: string, id2: string): number {
    const instrument1 = this.instruments.get(id1);
    const instrument2 = this.instruments.get(id2);

    if (!instrument1 || !instrument2) return 0;

    // Base correlation on instrument types and sectors
    let correlation = 0;

    // Same type of instrument has higher correlation
    if (instrument1.securityType === instrument2.securityType) {
      correlation += 0.3;
    }

    // Same market sector has higher correlation
    if (instrument1.marketSector === instrument2.marketSector) {
      correlation += 0.4;
    }

    // Same currency has higher correlation
    if (instrument1.notionalCurrency === instrument2.notionalCurrency) {
      correlation += 0.2;
    }

    // Add some randomness
    correlation += (Math.random() - 0.5) * 0.2;

    // Scale by the correlation strength from config
    correlation *= this.config.correlationStrength;

    // Ensure correlation is between -1 and 1
    return Math.max(-1, Math.min(1, correlation));
  }

  /**
   * Calculate price movement based on correlations with other instruments
   */
  private calculateCorrelatedMovement(id: string): number {
    let movement = 0;
    const correlations = this.correlationMatrix.get(id);

    if (!correlations) return 0;

    // Sum up correlated movements from other instruments
    correlations.forEach((correlation, otherId) => {
      const otherInstrument = this.instruments.get(otherId);
      if (otherInstrument) {
        // Use the most recent price change as a proxy for movement
        const otherMove = otherInstrument.percentageChange / 100;
        movement += correlation * otherMove;
      }
    });

    // Scale the movement to be less influential than direct factors
    return movement * 0.3;
  }
}