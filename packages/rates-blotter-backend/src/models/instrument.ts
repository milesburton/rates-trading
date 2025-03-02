/**
 * Core instrument interfaces for the rates blotter
 * Based on the comprehensive instrument data model specified in requirements
 */

// Common enums used across instruments
export enum SecurityType {
  BOND = 'Bond',
  SWAP = 'Swap',
  FUTURE = 'Future',
  OPTION = 'Option',
}

export enum DayCountConvention {
  THIRTY_360 = '30/360',
  ACT_365 = 'ACT/365',
  ACT_360 = 'ACT/360',
  ACT_ACT = 'ACT/ACT',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  CHF = 'CHF',
  CAD = 'CAD',
  AUD = 'AUD',
}

export enum TradingStatus {
  ACTIVE = 'Active',
  SUSPENDED = 'Suspended',
  HALTED = 'Halted',
  CLOSED = 'Closed',
}

export enum CreditRating {
  AAA = 'AAA',
  AA_PLUS = 'AA+',
  AA = 'AA',
  AA_MINUS = 'AA-',
  A_PLUS = 'A+',
  A = 'A',
  A_MINUS = 'A-',
  BBB_PLUS = 'BBB+',
  BBB = 'BBB',
  BBB_MINUS = 'BBB-',
  BB_PLUS = 'BB+',
  BB = 'BB',
  BB_MINUS = 'BB-',
  B_PLUS = 'B+',
  B = 'B',
  B_MINUS = 'B-',
  CCC = 'CCC',
  CC = 'CC',
  C = 'C',
  D = 'D',
}

/**
 * Base interface for all financial instruments
 * Contains fields common to all instrument types
 */
export interface Instrument {
  instrumentId: string;         // Unique identifier (e.g., "US10Y", "UK5Y")
  securityType: SecurityType;   // Type of security
  description: string;          // Human-readable description
  notionalCurrency: Currency;   // Currency of notional
  notionalAmount: number;       // Actual notional value
  notional: string;             // Notional amount formatted (e.g., "10M")
  trader: string;               // Trader ID
  book: string;                 // Trading book/desk
  counterparty: string;         // Counterparty ID

  // Market data
  bidPrice: number;             // Bid price
  askPrice: number;             // Ask price
  bidYield: number;             // Bid yield
  askYield: number;             // Ask yield
  bidSize: number;              // Size available at bid
  offerSize: number;            // Size available at offer
  lastTradePrice: number;       // Last traded price
  lastTradeSize: number;        // Size of last trade
  lastTradeTime: Date;          // Time of last trade

  // Reference data
  changeFromPrevClose: number;  // Change from previous day's close
  percentageChange: number;     // Percentage change from previous day
  status: TradingStatus;        // Trading status
  marketSector: string;         // Market sector/category
  rating: CreditRating;         // Credit rating
  liquidityScore: number;       // Measure of instrument liquidity (1-10)

  // Metadata
  lastUpdate: Date;             // Timestamp of last update
}

/**
 * Price/yield sensitivity metrics common to fixed income instruments
 */
export interface FixedIncomeSensitivityMetrics {
  duration: number;             // Modified duration
  convexity: number;            // Convexity measure
  dv01: number;                 // Dollar value of 01 (sensitivity to 1bp yield change)
  pv01: number;                 // Present value of 01
}

/**
 * Spread metrics common to fixed income instruments
 */
export interface SpreadMetrics {
  spread: number;               // Spread to benchmark in basis points
  zSpread: number;              // Zero-volatility spread in basis points
  oasSpread: number;            // Option-adjusted spread in basis points
  assetSwapSpread: number;      // Asset swap spread in basis points
}

/**
 * Date-related properties common to fixed income instruments
 */
export interface InstrumentDates {
  issueDate: Date;              // When the instrument was issued
  maturityDate: Date;           // When the instrument matures
  settlementDate: Date;         // When the trade settles
}
