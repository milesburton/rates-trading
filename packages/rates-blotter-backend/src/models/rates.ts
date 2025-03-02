import {
  Instrument,
  SecurityType,
  DayCountConvention,
  FixedIncomeSensitivityMetrics,
  SpreadMetrics,
  InstrumentDates
} from './instrument';

/**
 * Bond instrument interface
 * Extends base instrument with bond-specific properties
 */
export interface Bond extends
  Instrument,
  FixedIncomeSensitivityMetrics,
  SpreadMetrics,
  InstrumentDates {

  securityType: SecurityType.BOND;
  isin: string;                  // International Securities Identification Number
  cusip: string;                 // CUSIP (for US securities)
  couponRate: number;            // Annual coupon rate percentage
  frequency: number;             // Coupon payment frequency per year (e.g., 2 for semi-annual)
  dayCountConvention: DayCountConvention;  // Day count method

  price: number;                 // Clean price
  dirtyPrice: number;            // Price including accrued interest
  yield: number;                 // Yield to maturity percentage
  yieldToWorst: number;          // Worst case yield scenario
  accrued: number;               // Accrued interest
}

/**
 * Interest Rate Swap interface
 * Extends base instrument with swap-specific properties
 */
export interface InterestRateSwap extends
  Instrument,
  FixedIncomeSensitivityMetrics,
  InstrumentDates {

  securityType: SecurityType.SWAP;
  fixedRate: number;             // Fixed leg rate
  floatingIndex: string;         // Floating rate index (e.g., "LIBOR", "SOFR")
  floatingSpread: number;        // Spread over floating index in basis points
  paymentFrequency: number;      // Payment frequency per year
  dayCountConvention: DayCountConvention;  // Day count method
  effectiveDate: Date;           // Start date of swap
  swapCurve: string;             // Reference curve for pricing
  fixedLegDV01: number;          // DV01 of fixed leg
  floatingLegDV01: number;       // DV01 of floating leg
  currentFloatingRate: number;   // Current floating rate value
  nextResetDate: Date;           // Date of next floating rate reset
  swapRate: number;              // Current mid-market swap rate
}

/**
 * Interest Rate Future interface
 * Extends base instrument with futures-specific properties
 */
export interface InterestRateFuture extends
  Instrument,
  FixedIncomeSensitivityMetrics {

  securityType: SecurityType.FUTURE;
  contractMonth: string;         // Contract month (e.g., "Mar24")
  underlyingRate: string;        // Underlying rate or index
  tickSize: number;              // Minimum price movement
  tickValue: number;             // Value of one tick
  contractSize: number;          // Size of one contract
  expiryDate: Date;              // Expiration date
  deliveryDate: Date;            // Delivery date (if physical)
  openInterest: number;          // Open interest
  impliedRate: number;           // Rate implied by future price
  basisToSpot: number;           // Basis to spot instrument
  deliverableInstruments: string[]; // List of deliverable instruments (if applicable)
}

/**
 * Interest Rate Option interface
 * Extends base instrument with option-specific properties
 */
export interface InterestRateOption extends
  Instrument,
  FixedIncomeSensitivityMetrics {

  securityType: SecurityType.OPTION;
  optionType: 'Call' | 'Put';    // Call or Put
  underlyingId: string;          // ID of underlying instrument
  strikePrice: number;           // Strike price
  expiryDate: Date;              // Expiration date
  exerciseStyle: 'European' | 'American' | 'Bermudan'; // Exercise style
  impliedVol: number;            // Implied volatility
  delta: number;                 // Delta Greeks
  gamma: number;                 // Gamma Greeks
  theta: number;                 // Theta Greeks
  vega: number;                  // Vega Greeks
  rho: number;                   // Rho Greeks
  premium: number;               // Option premium
  intrinsicValue: number;        // Intrinsic value
  timeValue: number;             // Time value
}

/**
 * Type definition for all rates instruments
 */
export type RatesInstrument = Bond | InterestRateSwap | InterestRateFuture | InterestRateOption;
