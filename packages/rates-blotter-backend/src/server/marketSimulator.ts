import { InstrumentManager } from './instrumentManager';
import { DeltaUpdate } from '../types';
import { Instrument, SecurityType, TradingStatus } from '../models/instrument';
import { Bond } from '../models/bond';
import { InterestRateSwap } from '../models/interestRateSwap';
import { Future } from '../models/future';
import { Option } from '../models/option';

// ---------------------------------------------------------------------------
// Scenario / configuration types
// ---------------------------------------------------------------------------

export type MarketScenario = 'normal' | 'highVolatility' | 'trending' | 'flashEvent';

export interface MarketSimulatorOptions {
  updateInterval: number;
  scenario: MarketScenario;
  volatilityMultiplier: number;
}

type UpdateCallback = (updates: DeltaUpdate[]) => void;

// ---------------------------------------------------------------------------
// Scenario presets
// ---------------------------------------------------------------------------

const SCENARIO_PRESETS: Record<
  MarketScenario,
  { volatility: number; correlationStrength: number; flashProbability: number; flashMagnitude: number }
> = {
  normal:          { volatility: 0.2, correlationStrength: 0.7, flashProbability: 0.001, flashMagnitude: 3.0 },
  highVolatility:  { volatility: 0.8, correlationStrength: 0.5, flashProbability: 0.01,  flashMagnitude: 5.0 },
  trending:        { volatility: 0.3, correlationStrength: 0.8, flashProbability: 0.002, flashMagnitude: 2.5 },
  flashEvent:      { volatility: 1.2, correlationStrength: 0.3, flashProbability: 0.1,   flashMagnitude: 8.0 },
};

// ---------------------------------------------------------------------------
// Trend direction: re-randomised each flash event / scenario change, persistent between ticks
// ---------------------------------------------------------------------------

export class MarketSimulator {
  private options: MarketSimulatorOptions;
  private updateCallbacks: UpdateCallback[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private flashEventActive = false;
  private flashEventTimer: NodeJS.Timeout | null = null;

  /** Persistent trend direction per instrument: +1 / -1 */
  private trendDirections: Map<string, number> = new Map();

  /** Correlation matrix between instruments */
  private correlationMatrix: Map<string, Map<string, number>> = new Map();

  /** Track previous percentage change per instrument for correlation calculations */
  private lastPercentageChange: Map<string, number> = new Map();

  constructor(
    private instrumentManager: InstrumentManager,
    options: Partial<MarketSimulatorOptions> = {}
  ) {
    this.options = {
      updateInterval: options.updateInterval ?? 1000,
      scenario:       options.scenario ?? 'normal',
      volatilityMultiplier: options.volatilityMultiplier ?? 1.0,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.instrumentManager.getAllInstruments().length === 0) {
      this.instrumentManager.createExampleInstruments();
    }
    this.rebuildCorrelationMatrix();
    this.initTrendDirections();
  }

  start(): void {
    if (this.updateInterval !== null) return;
    this.updateInterval = setInterval(() => this.updateMarketData(), this.options.updateInterval);
  }

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

  onUpdate(callback: UpdateCallback): void {
    this.updateCallbacks.push(callback);
  }

  updateScenario(scenario: MarketScenario): void {
    this.options.scenario = scenario;
    this.initTrendDirections(); // re-randomise trend directions on scenario change
    this.rebuildCorrelationMatrix();
  }

  // ---------------------------------------------------------------------------
  // Core update loop
  // ---------------------------------------------------------------------------

  private updateMarketData(): void {
    const instruments = this.instrumentManager.getAllInstruments();

    instruments.forEach(instrument => {
      if (instrument.status === TradingStatus.SUSPENDED || instrument.status === TradingStatus.MATURED) return;

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

      instrument.lastUpdate = new Date();
    });

    const updates = this.instrumentManager.generateDeltaUpdates();
    if (updates.length > 0) {
      this.updateCallbacks.forEach(cb => cb(updates));
    }

    // Possibly start a flash event in highVolatility scenario
    const preset = SCENARIO_PRESETS[this.options.scenario];
    if (!this.flashEventActive && Math.random() < preset.flashProbability) {
      this.startFlashEvent();
    }
  }

  // ---------------------------------------------------------------------------
  // Flash events
  // ---------------------------------------------------------------------------

  private startFlashEvent(): void {
    console.log('[MarketSimulator] Flash event started');
    this.flashEventActive = true;
    const duration = 10_000 + Math.random() * 20_000;
    this.flashEventTimer = setTimeout(() => {
      console.log('[MarketSimulator] Flash event ended');
      this.flashEventActive = false;
      this.flashEventTimer = null;
    }, duration);
  }

  // ---------------------------------------------------------------------------
  // Volatility calculation
  // ---------------------------------------------------------------------------

  private getVolatilityFactor(): number {
    const preset = SCENARIO_PRESETS[this.options.scenario];
    let factor = preset.volatility;

    // Time-of-day effects
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    if ((hour === 9 && minute >= 30) || (hour === 16 && minute === 0)) {
      factor *= 2.0; // Market open / close
    } else if (hour >= 12 && hour <= 13) {
      factor *= 0.5; // Lunch
    }

    // Flash event amplifier
    if (this.flashEventActive) {
      factor *= preset.flashMagnitude;
    }

    return factor * this.options.volatilityMultiplier;
  }

  // ---------------------------------------------------------------------------
  // Normally-distributed random movement (Box–Muller approximation)
  // ---------------------------------------------------------------------------

  private normalRandom(): number {
    let r = 0;
    for (let i = 0; i < 6; i++) r += Math.random();
    return (r - 3) / 3; // Mean 0, StdDev ≈ 1
  }

  private generatePriceMove(baseMove: number): number {
    const volatility = this.getVolatilityFactor();
    let rand = this.normalRandom();

    // Apply persistent trend bias
    if (this.options.scenario === 'trending') {
      // Trend direction is fixed per cycle — no re-randomising each tick
      rand += 0.2;
    }

    return rand * volatility * baseMove;
  }

  // ---------------------------------------------------------------------------
  // Correlation helpers
  // ---------------------------------------------------------------------------

  private rebuildCorrelationMatrix(): void {
    this.correlationMatrix.clear();
    const instruments = this.instrumentManager.getAllInstruments();
    const preset = SCENARIO_PRESETS[this.options.scenario];

    instruments.forEach(i1 => {
      if (!this.correlationMatrix.has(i1.instrumentId)) {
        this.correlationMatrix.set(i1.instrumentId, new Map());
      }
      instruments.forEach(i2 => {
        if (i1.instrumentId === i2.instrumentId) return;
        const corr = this.computeCorrelation(i1, i2, preset.correlationStrength);
        this.correlationMatrix.get(i1.instrumentId)!.set(i2.instrumentId, corr);
      });
    });
  }

  private computeCorrelation(i1: Instrument, i2: Instrument, strength: number): number {
    let c = 0;
    if (i1.securityType === i2.securityType) c += 0.3;
    if (i1.marketSector === i2.marketSector) c += 0.4;
    if (i1.notionalCurrency === i2.notionalCurrency) c += 0.2;
    c += (Math.random() - 0.5) * 0.2; // small noise
    return Math.max(-1, Math.min(1, c * strength));
  }

  private calculateCorrelatedMovement(id: string): number {
    const correlations = this.correlationMatrix.get(id);
    if (!correlations) return 0;
    let movement = 0;
    correlations.forEach((corr, otherId) => {
      const otherMove = this.lastPercentageChange.get(otherId) ?? 0;
      movement += corr * otherMove;
    });
    return movement * 0.3; // scale down influence
  }

  // ---------------------------------------------------------------------------
  // Persistent trend directions
  // ---------------------------------------------------------------------------

  private initTrendDirections(): void {
    this.instrumentManager.getAllInstruments().forEach(i => {
      this.trendDirections.set(i.instrumentId, Math.random() > 0.5 ? 1 : -1);
    });
  }

  // ---------------------------------------------------------------------------
  // Instrument-specific update logic
  // ---------------------------------------------------------------------------

  private updateBondData(bond: Bond): void {
    const correlated = this.calculateCorrelatedMovement(bond.instrumentId);
    const volatility = this.getVolatilityFactor();
    let priceDelta = this.normalRandom() * volatility + correlated;

    if (this.options.scenario === 'trending') {
      const dir = this.trendDirections.get(bond.instrumentId) ?? 1;
      priceDelta += dir * 0.1 * volatility;
    }

    // Price: bonds trade near par; small percentage moves
    const priceMove = priceDelta * 0.05;
    bond.currentPrice = Math.max(50, parseFloat((bond.currentPrice + priceMove).toFixed(4)));

    // Yield: inverse relationship to price
    const yieldChange = -priceDelta * 0.01;
    bond.yieldToMaturity = Math.max(0.001, parseFloat((bond.yieldToMaturity + yieldChange).toFixed(4)));

    // Duration: small drift with yield
    const durationChange = yieldChange * 0.2;
    bond.duration = Math.max(0.1, parseFloat((bond.duration - durationChange).toFixed(4)));

    // Track for correlations
    const pctChange = priceMove / bond.currentPrice;
    this.lastPercentageChange.set(bond.instrumentId, pctChange);
  }

  private updateSwapData(swap: InterestRateSwap): void {
    const correlated = this.calculateCorrelatedMovement(swap.instrumentId);
    const volatility = this.getVolatilityFactor();
    let rateDelta = this.normalRandom() * volatility * 2 / 100 + correlated / 100;

    if (this.options.scenario === 'trending') {
      const dir = this.trendDirections.get(swap.instrumentId) ?? 1;
      rateDelta += dir * 0.0002 * volatility;
    }

    swap.fixedRate = Math.max(0.0001, parseFloat((swap.fixedRate + rateDelta).toFixed(4)));

    // MTM: opposite direction to rate movement; DV01 * notional / 10000 per bp
    const mtmChange = -rateDelta * swap.fixedLegDv01 * swap.notionalAmount / 100;
    swap.currentMtm = parseFloat((swap.currentMtm + mtmChange).toFixed(2));

    // DV01 drift
    const dv01Change = rateDelta * 5;
    swap.fixedLegDv01    = Math.max(0.01, parseFloat((swap.fixedLegDv01 - dv01Change).toFixed(2)));
    swap.floatingLegDv01 = Math.max(0.01, parseFloat((swap.floatingLegDv01 + dv01Change).toFixed(2)));

    this.lastPercentageChange.set(swap.instrumentId, rateDelta / swap.fixedRate);
  }

  private updateFutureData(future: Future): void {
    const correlated = this.calculateCorrelatedMovement(future.instrumentId);
    const tickSize = future.tickSize || 0.01;
    const numTicks = Math.round(this.generatePriceMove(5) + correlated * 10);
    const priceMove = numTicks * tickSize;

    future.currentPrice = Math.max(0.01, parseFloat((future.currentPrice + priceMove).toFixed(6)));
    future.priceChangeToday = parseFloat((future.priceChangeToday + priceMove).toFixed(6));

    // Open interest: slight upward drift plus noise
    const oiChange = Math.round((Math.random() - 0.45) * 100);
    future.openInterest = Math.max(0, future.openInterest + oiChange);

    // Volume: small random fluctuations
    const volChange = Math.round(future.volume * 0.01 * (Math.random() - 0.5));
    future.volume += volChange;

    this.lastPercentageChange.set(future.instrumentId, priceMove / future.currentPrice);
  }

  private updateOptionData(option: Option): void {
    const underlying = this.instrumentManager.getInstrument(option.underlyingAsset) as Future | undefined;
    if (!underlying) return;

    // Underlying move drives delta P&L
    const prevUnderlyingPct = this.lastPercentageChange.get(option.underlyingAsset) ?? 0;
    const underlyingMove = underlying.currentPrice * prevUnderlyingPct;

    const deltaPnL = option.delta * underlyingMove;
    const gammaPnL = 0.5 * option.gamma * underlyingMove * underlyingMove;
    const thetaPnL = -option.theta / 365; // daily decay

    const noiseMove = this.generatePriceMove(0.05);
    option.currentPrice = Math.max(0.01, parseFloat((option.currentPrice + deltaPnL + gammaPnL + thetaPnL + noiseMove).toFixed(4)));

    // Implied vol: small random changes
    const volChange = (Math.random() - 0.5) * 0.01;
    option.impliedVol = Math.max(1, parseFloat((option.impliedVol + volChange).toFixed(2)));

    // Greeks update
    const deltaChange = underlyingMove * option.gamma;
    if (option.optionType === 'call') {
      option.delta = Math.min(1,  parseFloat((option.delta + deltaChange).toFixed(4)));
    } else {
      option.delta = Math.max(-1, parseFloat((option.delta + deltaChange).toFixed(4)));
    }
    option.gamma = Math.max(0.001, parseFloat((option.gamma - Math.abs(deltaChange) * 0.1).toFixed(4)));
    option.theta = parseFloat((option.theta * 1.001).toFixed(4));
    option.vega  = parseFloat((option.vega * (1 + volChange * 0.01)).toFixed(4));

    // Intrinsic / time value
    if (option.optionType === 'call') {
      option.intrinsicValue = Math.max(0, parseFloat((underlying.currentPrice - option.strikePrice).toFixed(4)));
    } else {
      option.intrinsicValue = Math.max(0, parseFloat((option.strikePrice - underlying.currentPrice).toFixed(4)));
    }
    option.timeValue = Math.max(0, parseFloat((option.currentPrice - option.intrinsicValue).toFixed(4)));

    this.lastPercentageChange.set(option.instrumentId, (deltaPnL + noiseMove) / option.currentPrice);
  }
}
