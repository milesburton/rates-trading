import { Instrument } from './instrument';

/**
 * Interface for Option instruments
 */
export interface Option extends Instrument {
  underlyingAsset: string;
  optionType: 'call' | 'put';
  strikePrice: number;
  expirationDate: string;
  currentPrice: number;
  impliedVol: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  openInterest: number;
  volume: number;
  intrinsicValue: number;
  timeValue: number;
}