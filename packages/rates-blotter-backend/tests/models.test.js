import { describe, it, expect } from 'vitest';
import { SecurityType, Currency, TradingStatus } from '../src/models';
describe('Instrument Models', () => {
    it('should have the expected SecurityType enum values', () => {
        expect(SecurityType.BOND).toBe('Bond');
        expect(SecurityType.SWAP).toBe('Swap');
        expect(SecurityType.FUTURE).toBe('Future');
        expect(SecurityType.OPTION).toBe('Option');
    });
    it('should have the expected Currency enum values', () => {
        expect(Currency.USD).toBe('USD');
        expect(Currency.EUR).toBe('EUR');
        expect(Currency.GBP).toBe('GBP');
    });
    it('should have the expected TradingStatus enum values', () => {
        expect(TradingStatus.ACTIVE).toBe('Active');
        expect(TradingStatus.SUSPENDED).toBe('Suspended');
    });
});
