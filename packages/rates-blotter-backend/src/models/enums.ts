/**
 * Security type classification
 */
export enum SecurityType {
  GOVERNMENT_BOND = 'GOVERNMENT_BOND',
  CORPORATE_BOND = 'CORPORATE_BOND',
  INTEREST_RATE_SWAP = 'INTEREST_RATE_SWAP',
  FUTURE = 'FUTURE',
  OPTION = 'OPTION',
  MONEY_MARKET = 'MONEY_MARKET',
  REPO = 'REPO',
  FRA = 'FRA'
}

/**
 * Currency codes
 */
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  CHF = 'CHF',
  CAD = 'CAD',
  AUD = 'AUD',
  NZD = 'NZD'
}

/**
 * Instrument trading status
 */
export enum TradingStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  MATURED = 'MATURED',
  EXPIRED = 'EXPIRED'
}

/**
 * Credit ratings
 */
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
  CCC_PLUS = 'CCC+',
  CCC = 'CCC',
  CCC_MINUS = 'CCC-',
  CC = 'CC',
  C = 'C',
  D = 'D',
  NOT_RATED = 'NR'
}

/**
 * Day count convention for interest calculations
 */
export enum DayCountConvention {
  ACT_360 = 'ACT_360',
  ACT_365 = 'ACT_365',
  THIRTY_360 = 'THIRTY_360',
  ACT_ACT_ISDA = 'ACT_ACT_ISDA',
  ACT_ACT_ICMA = 'ACT_ACT_ICMA'
}

/**
 * Reference rate indices for floating rate instruments
 */
export enum ReferenceRateIndex {
  SOFR = 'SOFR',
  EURIBOR = 'EURIBOR',
  SONIA = 'SONIA',
  TONAR = 'TONAR',
  CORRA = 'CORRA',
  ESTR = 'ESTR',
  LIBOR_USD = 'LIBOR_USD', // Legacy
  LIBOR_GBP = 'LIBOR_GBP'  // Legacy
}

// For backward compatibility
export { TradingStatus as InstrumentStatus };