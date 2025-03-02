import { InstrumentManager } from './instrumentManager';
import { DeltaUpdate } from '../types';
import { Instrument, SecurityType, TradingStatus } from '../models/instrument';
import { Bond } from '../models/bond';
import { InterestRateSwap } from '../models/interestRateSwap';
import { Future } from '../models/future';
import { Option } from '../models/option';

interface MarketSimulatorOptions {
  updateInterval: number;
  scenario: 'normal' | 'highVolatility' | 'trending' | 'flashEvent';
  volatilityMultiplier: number;
}

type UpdateCallback = (updates: DeltaUpdate[]) => void;

/**
 * Simulates market data for instruments
 * Generates realistic price movements and updates
 */
export class MarketSimulator {
  private options: MarketSimulatorOptions;
  private updateCallbacks: UpdateCallback[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private flashEventActive: boolean = false;
  private flashEventTimer: NodeJS.Timeout | null = null;

  constructor(
    private instrumentManager: InstrumentManager,
    options: Partial<MarketSimulatorOptions> = {}
  ) {
    this.options = {
      updateInterval: options.updateInterval || 1000, // milliseconds
      scenario: options.scenario || 'normal',
      volatilityMultiplier: options.volatilityMultiplier || 1.0
    };
  }

  /**
   * Initialize the market simulator
   */
  async initialize(): Promise<void> {
    // Create example instruments if none exist
    if (this.instrumentManager.getAllInstruments().length === 0) {
      this.instrumentManager.createExampleInstruments();
    }
  }

  /**
   * Start the market simulator update cycle
   */
  start(): void {
    if (this.updateInterval !== null) {
      return; // Already running
    }

    this.updateInterval = setInterval(() => {
      this.updateMarketData();
    }, this.options.updateInterval);
  }

  /**
   * Stop the market simulator
   */
  stop(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.flashEventTimer !== null) {
      clearTimeout(this.flashEventTimer);
      this.flashEventTimer = null;
      this.flashEventActive = false;
    }
  }

  /**
   * Register a callback for market updates
   */
  onUpdate(callback: UpdateCallback): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Update market data for all instruments
   */
  private updateMarketData(): void {
    const instruments = this.instrumentManager.getAllInstruments();

    // Apply market scenario effects
    instruments.forEach(instrument => {
      switch (instrument.securityType) {
        case SecurityType.GOVERNMENT_BOND:
        case SecurityType.CORPORATE_BOND:
          this.updateBondData(instrument as Bond);
          break;

        case SecurityType.INTEREST_RATE_SWAP:
          this.updateSwapData(instrument as InterestRateSwap);
          break;

        case SecurityType.FUTURE:
          this.updateFutureData(instrument as Future);
          break;

        case SecurityType.OPTION:
          this.updateOptionData(instrument as Option);
          break;
      }

      // Update the last updated timestamp
      instrument.lastUpdate = Date();
    });

    // Generate delta updates
    const updates = this.instrumentManager.generateDeltaUpdates();

    // Notify callbacks if we have updates
    if (updates.length > 0) {
      this.updateCallbacks.forEach(callback => callback(updates));
    }

    // Randomly trigger a flash event in high volatility scenario
    if (this.options.scenario === 'highVolatility' && !this.flashEventActive) {
      if (Math.random() < 0.01) { // 1% chance per update cycle
        this.startFlashEvent();
      }
    }
  }

  /**
   * Start a flash event (short period of high volatility)
   */
  private startFlashEvent(): void {
    console.log('Flash event started');
    this.flashEventActive = true;

    // End the flash event after 10-30 seconds
    const duration = 10000 + Math.random() * 20000;
    this.flashEventTimer = setTimeout(() => {
      console.log('Flash event ended');
      this.flashEventActive = false;
      this.flashEventTimer = null;
    }, duration);
  }

  /**
   * Get the current volatility factor based on time of day and market scenario
   */
  private getVolatilityFactor(): number {
    let baseFactor = 1.0;

    // Get time-of-day effects (higher at open and close)
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Simulate U.S. market hours (9:30 AM - 4:00 PM)
    if ((hour === 9 && minute >= 30) || (hour === 16 && minute === 0)) {
      // Higher volatility at market open/close
      baseFactor *= 1.5;
    } else if (hour >= 12 && hour <= 13) {
      // Lower volatility during lunch
      baseFactor *= 0.8;
    }

    // Apply scenario-based factors
    switch (this.options.scenario) {
      case 'highVolatility':
        baseFactor *= 2.0;
        break;
      case 'trending':
        baseFactor *= 0.7; // Lower random moves, but with a trend
        break;
      case 'flashEvent':
        baseFactor *= 3.0;
        break;
    }

    // Flash events temporarily increase volatility
    if (this.flashEventActive) {
      baseFactor *= 3.0;
    }

    // Apply the user-defined multiplier
    baseFactor *= this.options.volatilityMultiplier;

    return baseFactor;
  }

  /**
   * Generate a random price move based on volatility and base move size
   */
  private generatePriceMove(baseMove: number): number {
    const volatility = this.getVolatilityFactor();

    // Generate a normally-distributed random number (approximation)
    let rand = 0;
    for (let i = 0; i < 6; i++) {
      rand += Math.random();
    }
    rand = (rand - 3) / 3; // Approximate normal distribution with mean 0 and std 1

    // Apply trend bias in trending scenario
    if (this.options.scenario === 'trending') {
      // Add a slight upward or downward trend (-0.2 to +0.2)
      const trend = 0.2 * (2 * Math.random() - 1);
      rand += trend;
    }

    // Scale by volatility and base move size
    return rand * volatility * baseMove;
  }

  /**
   * Update data for a bond instrument
   */
  private updateBondData(bond: Bond): void {
    // Generate price move (bonds typically move in small increments)
    const priceMove = this.generatePriceMove(0.05);
    const newPrice = Math.max(bond.currentPrice + priceMove, 50); // Bonds don't go to zero

    // Update price
    bond.currentPrice = parseFloat(newPrice.toFixed(4));

    // Update yield (inversely related to price)
    // Simple approximation: assume linear relationship for small moves
    const yieldChange = -priceMove * 0.01; // 1bp yield change for each 0.1 price change
    bond.yieldToMaturity = parseFloat((bond.yieldToMaturity + yieldChange).toFixed(4));

    // Update duration (changes slightly with yield)
    const durationChange = yieldChange * 0.2; // Duration decreases as yield increases
    bond.duration = parseFloat((bond.duration - durationChange).toFixed(4));
  }

  /**
   * Update data for an interest rate swap
   */
  private updateSwapData(swap: InterestRateSwap): void {
    // Generate rate move (in basis points, 1/100 of a percent)
    const bpsMove = this.generatePriceMove(2) / 100;

    // Update fixed rate
    swap.fixedRate = parseFloat((swap.fixedRate + bpsMove).toFixed(4));

    // Update mark-to-market value (opposite direction to rate movement)
    // 1bp change in rates = dv01 * notional / 10000 change in MTM
    const mtmChange = -bpsMove * swap.fixedLegDv01 * swap.notionalAmount / 100;
    swap.currentMtm = parseFloat((swap.currentMtm + mtmChange).toFixed(2));

    // Update DV01 (small changes as rates move)
    const dv01Change = bpsMove * 5; // Small adjustment to DV01 as rates change
    swap.fixedLegDv01 = parseFloat((swap.fixedLegDv01 - dv01Change).toFixed(2));
    swap.floatingLegDv01 = parseFloat((swap.floatingLegDv01 + dv01Change).toFixed(2));
  }

  /**
   * Update data for a futures contract
   */
  private updateFutureData(future: Future): void {
    // Futures prices move in ticks
    const tickSize = future.tickSize || 0.01;
    const numTicks = Math.round(this.generatePriceMove(5));
    const priceMove = numTicks * tickSize;

    // Update price
    future.currentPrice = parseFloat((future.currentPrice + priceMove).toFixed(6));

    // Update daily price change
    future.priceChangeToday = parseFloat((future.priceChangeToday + priceMove).toFixed(6));

    // Update volume (random fluctuations)
    const volumeChange = Math.round(future.volume * 0.01 * (Math.random() - 0.5));
    future.volume += volumeChange;
  }

  /**
   * Update data for an option contract
   */
  private updateOptionData(option: Option): void {
    // Get the underlying future
    const underlyingId = option.underlyingAsset;
    const underlying = this.instrumentManager.getInstrument(underlyingId) as Future;

    if (!underlying) {
      // Skip update if we can't find the underlying
      return;
    }

    // Calculate new option price based on underlying move
    const underlyingPriceBefore = underlying.currentPrice - underlying.priceChangeToday;
    const underlyingMove = underlying.currentPrice - underlyingPriceBefore;

    // Delta tells us how much the option price moves for a 1-point move in underlying
    const optionMove = underlyingMove * option.delta;

    // Apply some random noise to the option price (implied vol changes)
    const noiseMove = this.generatePriceMove(0.05);
    const totalMove = optionMove + noiseMove;

    // Update option price
    option.currentPrice = Math.max(0.01, parseFloat((option.currentPrice + totalMove).toFixed(4)));

    // Update implied volatility (inverse to price for same delta)
    const volChange = -noiseMove * 0.5;
    option.impliedVol = Math.max(1, parseFloat((option.impliedVol + volChange).toFixed(2)));

    // Update greeks
    // Delta moves toward 1 (call) or -1 (put) as underlying increases
    const deltaChange = underlyingMove * option.gamma;
    if (option.optionType === 'call') {
      option.delta = Math.min(1, parseFloat((option.delta + deltaChange).toFixed(4)));
    } else {
      option.delta = Math.max(-1, parseFloat((option.delta + deltaChange).toFixed(4)));
    }

    // Gamma decreases as option moves deeper ITM or OTM
    option.gamma = Math.max(0.01, parseFloat((option.gamma - Math.abs(deltaChange) * 0.1).toFixed(4)));

    // Theta decay (time value decreases each day)
    option.theta = parseFloat((option.theta * 1.001).toFixed(4));

    // Vega changes with implied vol
    option.vega = parseFloat((option.vega * (1 + volChange * 0.01)).toFixed(4));

    // Update intrinsic and time value
    if (option.optionType === 'call') {
      option.intrinsicValue = Math.max(0, parseFloat((underlying.currentPrice - option.strikePrice).toFixed(4)));
    } else {
      option.intrinsicValue = Math.max(0, parseFloat((option.strikePrice - underlying.currentPrice).toFixed(4)));
    }

    option.timeValue = parseFloat((option.currentPrice - option.intrinsicValue).toFixed(4));
  }
}