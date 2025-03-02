import {
  Instrument,
  SecurityType,
  Currency,
  TradingStatus,
} from "../models/instrument";
import { generateDeltaUpdate } from "../utils/deltaUpdates";
import { DeltaUpdate } from "../types";
import { CreditRating, DayCountConvention } from "../models/enums";
import { Option } from "../models/option";
import { Future } from "../models/future";
import { Bond, InterestRateSwap } from "../models";

/**
 * Manages the collection of financial instruments
 * Handles CRUD operations and lookup
 */
export class InstrumentManager {
  private instruments: Map<string, Instrument> = new Map();
  private previousStates: Map<string, Instrument> = new Map();

  constructor() {}

  /**
   * Initialize with a set of instruments
   */
  initialize(instruments: Instrument[]): void {
    instruments.forEach((instrument) => {
      this.instruments.set(instrument.instrumentId, instrument);
      // Deep clone for previous state
      this.previousStates.set(
        instrument.instrumentId,
        JSON.parse(JSON.stringify(instrument))
      );
    });
  }

  /**
   * Get all instruments
   */
  getAllInstruments(): Instrument[] {
    return Array.from(this.instruments.values());
  }

  /**
   * Get instrument by ID
   */
  getInstrument(instrumentId: string): Instrument | undefined {
    return this.instruments.get(instrumentId);
  }

  /**
   * Get instruments by type
   */
  getInstrumentsByType(type: SecurityType): Instrument[] {
    return this.getAllInstruments().filter(
      (instrument) => instrument.securityType === type
    );
  }

  /**
   * Get instruments by currency
   */
  getInstrumentsByCurrency(currency: Currency): Instrument[] {
    return this.getAllInstruments().filter(
      (instrument) => instrument.notionalCurrency === currency
    );
  }

  /**
   * Get instruments by status
   */
  getInstrumentsByStatus(status: TradingStatus): Instrument[] {
    return this.getAllInstruments().filter(
      (instrument) => instrument.status === status
    );
  }

  /**
   * Add a new instrument
   */
  addInstrument(instrument: Instrument): void {
    this.instruments.set(instrument.instrumentId, instrument);
    this.previousStates.set(
      instrument.instrumentId,
      JSON.parse(JSON.stringify(instrument))
    );
  }

  /**
   * Update an instrument
   */
  updateInstrument(
    instrumentId: string,
    updates: Partial<Instrument>
  ): Instrument | undefined {
    const instrument = this.instruments.get(instrumentId);

    if (!instrument) {
      return undefined;
    }

    // Save previous state
    this.previousStates.set(
      instrumentId,
      JSON.parse(JSON.stringify(instrument))
    );

    // Apply updates
    Object.assign(instrument, updates);

    return instrument;
  }

  /**
   * Remove an instrument
   */
  removeInstrument(instrumentId: string): boolean {
    this.previousStates.delete(instrumentId);
    return this.instruments.delete(instrumentId);
  }

  /**
   * Generate delta updates for all changed instruments
   */
  generateDeltaUpdates(): DeltaUpdate[] {
    const updates: DeltaUpdate[] = [];

    for (const [instrumentId, instrument] of this.instruments.entries()) {
      const previousState = this.previousStates.get(instrumentId);

      if (previousState) {
        const delta = generateDeltaUpdate(previousState, instrument);

        if (delta && Object.keys(delta.fields).length > 0) {
          updates.push({
            instrumentId: instrumentId,
            timestamp: Date.now(),
            fields: delta.fields,
          });

          // Update previous state
          this.previousStates.set(
            instrumentId,
            JSON.parse(JSON.stringify(instrument))
          );
        }
      }
    }

    return updates;
  }

  /**
   * Create example instruments for testing
   */
  createExampleInstruments(): Instrument[] {
    const instruments: Instrument[] = [];
    const now = new Date();

    // Create some US Treasury bonds
    const bond1: Bond = {
      instrumentId: "US10Y",
      securityType: SecurityType.GOVERNMENT_BOND,
      description: "US 10-Year Treasury",
      notionalCurrency: Currency.USD,
      notionalAmount: 10000000,
      notional: "10M",
      trader: "TRADER1",
      book: "US_RATES",
      counterparty: "CENTRAL_BANK",
      // Market data
      bidPrice: 98.75,
      askPrice: 98.78,
      bidYield: 4.45,
      askYield: 4.42,
      bidSize: 25000000,
      offerSize: 15000000,
      lastTradePrice: 98.76,
      lastTradeSize: 5000000,
      lastTradeTime: new Date(now.getTime() - 30000), // 30 seconds ago
      // Reference data
      changeFromPrevClose: -0.12,
      percentageChange: -0.12,
      status: TradingStatus.ACTIVE,
      marketSector: "Government",
      rating: CreditRating.AAA,
      liquidityScore: 9.5,
      // Metadata
      lastUpdate: now,
      // Bond-specific properties
      issuer: "U.S. Treasury",
      maturityDate: "2033-03-31",
      coupon: 4.25,
      couponFrequency: 2,
      faceValue: 100,
      currentPrice: 98.75,
      yieldToMaturity: 4.42,
      duration: 8.65,
      convexity: 0.85,
      bondType: "Treasury",
      issueDate: "2023-03-31",
      nextCouponDate: "2023-09-30",
    };

    const bond2: Bond = {
      instrumentId: "US2Y",
      securityType: SecurityType.GOVERNMENT_BOND,
      description: "US 2-Year Treasury",
      notionalCurrency: Currency.USD,
      notionalAmount: 5000000,
      notional: "5M",
      trader: "TRADER2",
      book: "US_RATES_ST",
      counterparty: "CENTRAL_BANK",
      // Market data
      bidPrice: 99.82,
      askPrice: 99.85,
      bidYield: 4.91,
      askYield: 4.89,
      bidSize: 15000000,
      offerSize: 20000000,
      lastTradePrice: 99.83,
      lastTradeSize: 3000000,
      lastTradeTime: new Date(now.getTime() - 15000), // 15 seconds ago
      // Reference data
      changeFromPrevClose: 0.03,
      percentageChange: 0.03,
      status: TradingStatus.ACTIVE,
      marketSector: "Government",
      rating: CreditRating.AAA,
      liquidityScore: 9.8,
      // Metadata
      lastUpdate: now,
      // Bond-specific properties
      issuer: "U.S. Treasury",
      maturityDate: "2025-03-31",
      coupon: 4.85,
      couponFrequency: 2,
      faceValue: 100,
      currentPrice: 99.85,
      yieldToMaturity: 4.89,
      duration: 1.92,
      convexity: 0.04,
      bondType: "Treasury",
      issueDate: "2023-03-31",
      nextCouponDate: "2023-09-30",
    };

    // Add an Interest Rate Swap
    const swap1: InterestRateSwap = {
      instrumentId: "USD5YIRS",
      securityType: SecurityType.INTEREST_RATE_SWAP,
      description: "USD 5Y IRS",
      notionalCurrency: Currency.USD,
      notionalAmount: 10000000,
      notional: "10M",
      trader: "TRADER3",
      book: "IR_SWAPS",
      counterparty: "BANK_OF_AMERICA",
      // Market data
      bidPrice: 4.33,
      askPrice: 4.35,
      bidYield: 0,
      askYield: 0,
      bidSize: 20000000,
      offerSize: 20000000,
      lastTradePrice: 4.34,
      lastTradeSize: 10000000,
      lastTradeTime: new Date(now.getTime() - 120000), // 2 minutes ago

      // Reference data
      changeFromPrevClose: 0.02,
      percentageChange: 0.46,
      status: TradingStatus.ACTIVE,
      marketSector: "Interest Rate",
      rating: CreditRating.NOT_RATED,
      liquidityScore: 8.5,
      // Metadata
      lastUpdate: now,
      // Swap-specific properties
      effectiveDate: "2023-04-01",
      maturityDate: "2028-04-01",
      fixedRate: 4.35,
      floatingRateIndex: "SOFR",
      floatingRateSpread: 0.15,
      paymentFrequency: 4,
      currentMtm: 250000,
      fixedLegDv01: 4850,
      floatingLegDv01: 4825,
      spread: 0,
      dayCountConvention: DayCountConvention.THIRTY_360,
      settlementDays: 0,
      isin: "",
      cusip: "",
      sedol: "",
      bbid: "",
      ric: "",
      settlementDate: "",
      underlyingAsset: ""
    };

    // Add a Future contract
    const future1: Future = {
      instrumentId: "ZN-U23",
      securityType: SecurityType.FUTURE,
      description: "10-Year T-Note Future Sep 23",
      notionalCurrency: Currency.USD,
      notionalAmount: 100000,
      notional: "100K",
      trader: "TRADER1",
      book: "FUTURES",
      counterparty: "CME",
      // Market data
      bidPrice: 112.23,
      askPrice: 112.25,
      bidYield: 0,
      askYield: 0,
      bidSize: 1000,
      offerSize: 850,
      lastTradePrice: 112.25,
      lastTradeSize: 100,
      lastTradeTime: new Date(now.getTime() - 5000), // 5 seconds ago

      // Reference data
      changeFromPrevClose: -0.375,
      percentageChange: -0.33,
      status: TradingStatus.ACTIVE,
      marketSector: "Futures",
      rating: CreditRating.NOT_RATED,
      liquidityScore: 9.2,
      // Metadata
      lastUpdate: now,
      // Future-specific properties
      underlyingAsset: "US 10-Year Treasury",
      expirationDate: "2023-09-19",
      contractSize: 100000,
      tickSize: 0.015625,
      currentPrice: 112.25,
      openInterest: 1250000,
      volume: 525000,
      lastTradeDate: "2023-09-19",
      priceChangeToday: -0.375,
      fixedRate: 0,
      floatingRateIndex: "",
      floatingRateSpread: 0,
      spread: 0,
      dayCountConvention: DayCountConvention.THIRTY_360,
      paymentFrequency: 0,
      settlementDays: 0,
      currentMtm: 0,
      isin: "",
      cusip: "",
      sedol: "",
      bbid: "",
      ric: "",
      effectiveDate: "",
      maturityDate: "",
      settlementDate: "",
      fixedLegDv01: 0,
      floatingLegDv01: 0
    };

    // Add an Option
    const option1: Option = {
      instrumentId: "ZN-U23-P114",
      securityType: SecurityType.OPTION,
      description: "10-Year T-Note Future Sep 23 Put 114",
      notionalCurrency: Currency.USD,
      notionalAmount: 100000,
      notional: "100K",
      trader: "TRADER4",
      book: "OPTIONS",
      counterparty: "CME",
      // Market data
      bidPrice: 1.73,
      askPrice: 1.75,
      bidYield: 0,
      askYield: 0,
      bidSize: 500,
      offerSize: 350,
      lastTradePrice: 1.75,
      lastTradeSize: 50,
      lastTradeTime: new Date(now.getTime() - 180000), // 3 minutes ago

      // Reference data
      changeFromPrevClose: 0.05,
      percentageChange: 2.94,
      status: TradingStatus.ACTIVE,
      marketSector: "Options",
      rating: CreditRating.NOT_RATED,
      liquidityScore: 7.8,
      // Metadata
      lastUpdate: now,
      // Option-specific properties
      underlyingAsset: "ZN-U23",
      optionType: "put",
      strikePrice: 114.0,
      expirationDate: "2023-09-15",
      currentPrice: 1.75,
      impliedVol: 22.5,
      delta: -0.35,
      gamma: 0.08,
      theta: -0.03,
      vega: 0.15,
      openInterest: 85000,
      volume: 12500,
      intrinsicValue: 1.75,
      timeValue: 0.0,
      fixedRate: 0,
      floatingRateIndex: "",
      floatingRateSpread: 0,
      spread: 0,
      dayCountConvention: DayCountConvention.THIRTY_360,
      paymentFrequency: 0,
      settlementDays: 0,
      currentMtm: 0,
      isin: "",
      cusip: "",
      sedol: "",
      bbid: "",
      ric: "",
      effectiveDate: "",
      maturityDate: "",
      settlementDate: "",
      fixedLegDv01: 0,
      floatingLegDv01: 0
    };

    instruments.push(bond1, bond2, swap1, future1, option1);

    // Initialize our manager with these instruments
    this.initialize(instruments);

    return instruments;
  }
}
