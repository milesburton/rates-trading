import { Instrument } from './instrument';

/**
 * Interface for Interest Rate Swap instruments
 */
export interface InterestRateSwap extends Instrument {
  notionalAmount: number;
  effectiveDate: string;
  maturityDate: string;
  fixedRate: number;
  floatingRateIndex: string;
  floatingRateSpread: number;
  paymentFrequency: number;
  currentMtm: number;
  fixedLegDv01: number;
  floatingLegDv01: number;
}