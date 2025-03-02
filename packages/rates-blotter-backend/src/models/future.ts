import { Instrument } from './instrument';

/**
 * Interface for Future instruments
 */
export interface Future extends Instrument {
  underlyingAsset: string;
  expirationDate: string;
  contractSize: number;
  tickSize: number;
  currentPrice: number;
  openInterest: number;
  volume: number;
  lastTradeDate: string;
  priceChangeToday: number;
}