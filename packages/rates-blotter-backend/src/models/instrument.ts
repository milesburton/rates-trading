import {
  SecurityType,
  Currency,
  TradingStatus,
  CreditRating,
  DayCountConvention,
} from "./enums";

/**
 * Base interface for all financial instruments
 */
export interface Instrument {
  instrumentId: string; // Unique identifier (e.g., "US10Y", "UK5Y")
  securityType: SecurityType; // Type of security
  description: string; // Human-readable description
  notionalCurrency: Currency; // Currency of notional
  notionalAmount: number; // Actual notional value
  notional: string; // Notional amount formatted (e.g., "10M")
  trader: string; // Trader ID
  book: string; // Trading book/desk
  counterparty: string; // Counterparty ID
  fixedRate: number; // Fixed rate (for fixed income instruments)
  floatingRateIndex: string; // Index for floating rate instruments
  floatingRateSpread: number; // Spread to benchmark (for floating rate instruments)
  spread: number; // Spread to benchmark (for floating rate instruments)
  dayCountConvention: DayCountConvention; // Day count convention for interest calculations
  paymentFrequency: number; // Frequency of interest payments
  settlementDays: number; // Settlement period in days
  currentMtm: number; // Current mark-to-market value
  isin: string; // ISIN code
  cusip: string; // CUSIP code
  sedol: string; // SEDOL code
  bbid: string; // Bloomberg ID
  ric: string; // Reuters ID
  // Market data
  bidPrice: number; // Bid price
  askPrice: number; // Ask price
  bidYield: number; // Bid yield
  askYield: number; // Ask yield
  bidSize: number; // Size available at bid
  offerSize: number; // Size available at offer
  lastTradePrice: number; // Last traded price
  lastTradeSize: number; // Size of last trade
  lastTradeTime: Date; // Time of last trade
  // Reference data
  changeFromPrevClose: number; // Change from previous day's close
  percentageChange: number; // Percentage change from previous day
  status: TradingStatus; // Trading status
  marketSector: string; // Market sector/category
  rating: CreditRating; // Credit rating
  liquidityScore: number; // Measure of instrument liquidity (1-10)
  // Metadata
  lastUpdate: Date; // Timestamp of last update
}

/**
 * Price/yield sensitivity metrics common to fixed income instruments
 */
export interface FixedIncomeSensitivityMetrics {
  duration: number; // Modified duration
  convexity: number; // Convexity measure
  dv01: number; // Dollar value of 01 (sensitivity to 1bp yield change)
  pv01: number; // Present value of 01
}

/**
 * Spread metrics common to fixed income instruments
 */
export interface SpreadMetrics {
  spread: number; // Spread to benchmark in basis points
  zSpread: number; // Zero-volatility spread in basis points
  oasSpread: number; // Option-adjusted spread in basis points
  assetSwapSpread: number; // Asset swap spread in basis points
}

/**
 * Date-related properties common to fixed income instruments
 */
export interface InstrumentDates {
  issueDate: Date; // When the instrument was issued
  maturityDate: Date; // When the instrument matures
  settlementDate: Date; // When the trade settles
}

export { SecurityType, Currency, TradingStatus };
