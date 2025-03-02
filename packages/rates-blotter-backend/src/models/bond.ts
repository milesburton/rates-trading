import { Instrument } from './instrument';

/**
 * Interface for Bond instruments
 */
export interface Bond extends Instrument {
  issuer: string;
  maturityDate: string;
  coupon: number;
  couponFrequency: number;
  faceValue: number;
  currentPrice: number;
  yieldToMaturity: number;
  duration: number;
  convexity: number;
  bondType: string;
  issueDate: string;
  nextCouponDate: string;
}