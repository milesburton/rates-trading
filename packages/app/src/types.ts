export type SecurityType =
  | 'GOVERNMENT_BOND'
  | 'CORPORATE_BOND'
  | 'INTEREST_RATE_SWAP'
  | 'FUTURE'
  | 'OPTION';

export interface BaseInstrument {
  instrumentId: string;
  securityType: SecurityType;
  description: string;
  notionalCurrency: string;
  notionalAmount: number;
  notional: string;
  trader: string;
  book: string;
  bidPrice: number;
  askPrice: number;
  bidYield: number;
  askYield: number;
  bidSize: number;
  offerSize: number;
  lastTradePrice: number;
  lastTradeSize: number;
  lastTradeTime: string;
  changeFromPrevClose: number;
  percentageChange: number;
  status: string;
  marketSector: string;
  rating: string;
  liquidityScore: number;
  lastUpdate: string;
}

export interface Bond extends BaseInstrument {
  securityType: 'GOVERNMENT_BOND' | 'CORPORATE_BOND';
  issuer: string;
  coupon: number;
  yieldToMaturity: number;
  duration: number;
  convexity: number;
  currentPrice: number;
  maturityDate: string;
}

export interface Swap extends BaseInstrument {
  securityType: 'INTEREST_RATE_SWAP';
  fixedRate: number;
  floatingRateIndex: string;
  currentMtm: number;
  fixedLegDv01: number;
  floatingLegDv01: number;
  maturityDate: string;
}

export interface Future extends BaseInstrument {
  securityType: 'FUTURE';
  underlyingAsset: string;
  currentPrice: number;
  openInterest: number;
  volume: number;
  priceChangeToday: number;
  expirationDate: string;
}

export interface Option extends BaseInstrument {
  securityType: 'OPTION';
  underlyingAsset: string;
  optionType: 'call' | 'put';
  strikePrice: number;
  currentPrice: number;
  impliedVol: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  intrinsicValue: number;
  timeValue: number;
}

export type Instrument = Bond | Swap | Future | Option;

export interface DeltaUpdate {
  instrumentId: string;
  timestamp: number;
  fields: Record<string, unknown>;
}
