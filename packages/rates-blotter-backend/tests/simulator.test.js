import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MarketSimulator, MarketScenario, TimeOfDay, HIGH_VOLATILITY } from '../src/simulator';
import { SecurityType, Currency, TradingStatus, CreditRating, DayCountConvention } from '../src/models';
describe('MarketSimulator', () => {
    let simulator;
    beforeEach(() => {
        // Create a new simulator with a test configuration
        simulator = new MarketSimulator({
            updateFrequencyMs: 100, // Fast updates for testing
            volatilityFactor: 0.2,
            correlationStrength: 0.7,
            scenario: MarketScenario.NORMAL,
            timeOfDay: TimeOfDay.MORNING,
            flashEventProbability: 0.001,
            flashEventMagnitude: 3.0,
        });
        // Mock timers
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('should initialize with the provided configuration', () => {
        expect(simulator).toBeDefined();
    });
    it('should add an instrument and retrieve it by ID', () => {
        // Create a test bond
        const testBond = {
            instrumentId: 'US10Y',
            securityType: SecurityType.BOND,
            description: 'US 10 Year Treasury',
            isin: 'US1234567890',
            cusip: '123456789',
            issueDate: new Date('2023-01-15'),
            maturityDate: new Date('2033-01-15'),
            settlementDate: new Date('2023-01-17'),
            couponRate: 3.5,
            frequency: 2,
            dayCountConvention: DayCountConvention.THIRTY_360,
            price: 99.5,
            dirtyPrice: 100.2,
            yield: 3.55,
            yieldToWorst: 3.55,
            duration: 8.7,
            convexity: 0.85,
            dv01: 0.087,
            pv01: 0.087,
            spread: 25,
            zSpread: 28,
            oasSpread: 30,
            assetSwapSpread: 27,
            accrued: 0.7,
            notionalCurrency: Currency.USD,
            notionalAmount: 10000000,
            notional: '10M',
            trader: 'TRADER1',
            book: 'GOVT_BONDS',
            counterparty: 'BANK_A',
            bidPrice: 99.4,
            askPrice: 99.6,
            bidYield: 3.56,
            askYield: 3.54,
            bidSize: 5000000,
            offerSize: 8000000,
            lastTradePrice: 99.5,
            lastTradeSize: 2000000,
            lastTradeTime: new Date(),
            changeFromPrevClose: 0.2,
            percentageChange: 0.2,
            status: TradingStatus.ACTIVE,
            marketSector: 'Government',
            rating: CreditRating.AAA,
            liquidityScore: 9,
            lastUpdate: new Date()
        };
        // Add the instrument to the simulator
        simulator.addInstrument(testBond);
        // Retrieve the instrument
        const retrieved = simulator.getInstrument('US10Y');
        // Check that the retrieved instrument matches the original
        expect(retrieved).toBeDefined();
        expect(retrieved?.instrumentId).toBe('US10Y');
        expect(retrieved?.securityType).toBe(SecurityType.BOND);
    });
    it('should notify subscribers when an instrument is updated', async () => {
        // Create a test bond
        const testBond = {
            instrumentId: 'US10Y',
            securityType: SecurityType.BOND,
            description: 'US 10 Year Treasury',
            isin: 'US1234567890',
            cusip: '123456789',
            issueDate: new Date('2023-01-15'),
            maturityDate: new Date('2033-01-15'),
            settlementDate: new Date('2023-01-17'),
            couponRate: 3.5,
            frequency: 2,
            dayCountConvention: DayCountConvention.THIRTY_360,
            price: 99.5,
            dirtyPrice: 100.2,
            yield: 3.55,
            yieldToWorst: 3.55,
            duration: 8.7,
            convexity: 0.85,
            dv01: 0.087,
            pv01: 0.087,
            spread: 25,
            zSpread: 28,
            oasSpread: 30,
            assetSwapSpread: 27,
            accrued: 0.7,
            notionalCurrency: Currency.USD,
            notionalAmount: 10000000,
            notional: '10M',
            trader: 'TRADER1',
            book: 'GOVT_BONDS',
            counterparty: 'BANK_A',
            bidPrice: 99.4,
            askPrice: 99.6,
            bidYield: 3.56,
            askYield: 3.54,
            bidSize: 5000000,
            offerSize: 8000000,
            lastTradePrice: 99.5,
            lastTradeSize: 2000000,
            lastTradeTime: new Date(),
            changeFromPrevClose: 0.2,
            percentageChange: 0.2,
            status: TradingStatus.ACTIVE,
            marketSector: 'Government',
            rating: CreditRating.AAA,
            liquidityScore: 9,
            lastUpdate: new Date()
        };
        // Create a mock callback
        const mockCallback = vi.fn();
        // Subscribe to updates
        simulator.subscribeToUpdates(mockCallback);
        // Add the instrument
        simulator.addInstrument(testBond);
        // Check that the callback was called with the full instrument
        expect(mockCallback).toHaveBeenCalledWith('US10Y', testBond, true);
        // Reset the mock
        mockCallback.mockReset();
        // Start the simulator
        simulator.start();
        // Advance timers to trigger an update
        await vi.advanceTimersByTimeAsync(200);
        // Check that the callback was called with an update
        expect(mockCallback).toHaveBeenCalled();
        expect(mockCallback.mock.calls[0][0]).toBe('US10Y');
        // Second argument should be the partial update
        expect(mockCallback.mock.calls[0][2]).toBe(false); // Not a full update
    });
    it('should update simulator configuration', () => {
        // Update configuration to high volatility
        simulator.updateConfig(HIGH_VOLATILITY);
        // Add a test instrument
        const testBond = {
            instrumentId: 'US10Y',
            securityType: SecurityType.BOND,
            description: 'US 10 Year Treasury',
            isin: 'US1234567890',
            cusip: '123456789',
            issueDate: new Date('2023-01-15'),
            maturityDate: new Date('2033-01-15'),
            settlementDate: new Date('2023-01-17'),
            couponRate: 3.5,
            frequency: 2,
            dayCountConvention: DayCountConvention.THIRTY_360,
            price: 99.5,
            dirtyPrice: 100.2,
            yield: 3.55,
            yieldToWorst: 3.55,
            duration: 8.7,
            convexity: 0.85,
            dv01: 0.087,
            pv01: 0.087,
            spread: 25,
            zSpread: 28,
            oasSpread: 30,
            assetSwapSpread: 27,
            accrued: 0.7,
            notionalCurrency: Currency.USD,
            notionalAmount: 10000000,
            notional: '10M',
            trader: 'TRADER1',
            book: 'GOVT_BONDS',
            counterparty: 'BANK_A',
            bidPrice: 99.4,
            askPrice: 99.6,
            bidYield: 3.56,
            askYield: 3.54,
            bidSize: 5000000,
            offerSize: 8000000,
            lastTradePrice: 99.5,
            lastTradeSize: 2000000,
            lastTradeTime: new Date(),
            changeFromPrevClose: 0.2,
            percentageChange: 0.2,
            status: TradingStatus.ACTIVE,
            marketSector: 'Government',
            rating: CreditRating.AAA,
            liquidityScore: 9,
            lastUpdate: new Date()
        };
        // Create a mock callback
        const mockCallback = vi.fn();
        // Subscribe to updates
        simulator.subscribeToUpdates(mockCallback);
        // Add the instrument
        simulator.addInstrument(testBond);
        // Reset the mock
        mockCallback.mockReset();
        // Start the simulator
        simulator.start();
        // Advance timers to trigger an update
        vi.advanceTimersByTime(1000);
        // Verify that the callback was called
        expect(mockCallback).toHaveBeenCalled();
    });
    it('should stop generating updates when simulator is stopped', () => {
        // Add a test instrument
        const testBond = {
            instrumentId: 'US10Y',
            securityType: SecurityType.BOND,
            description: 'US 10 Year Treasury',
            isin: 'US1234567890',
            cusip: '123456789',
            issueDate: new Date('2023-01-15'),
            maturityDate: new Date('2033-01-15'),
            settlementDate: new Date('2023-01-17'),
            couponRate: 3.5,
            frequency: 2,
            dayCountConvention: DayCountConvention.THIRTY_360,
            price: 99.5,
            dirtyPrice: 100.2,
            yield: 3.55,
            yieldToWorst: 3.55,
            duration: 8.7,
            convexity: 0.85,
            dv01: 0.087,
            pv01: 0.087,
            spread: 25,
            zSpread: 28,
            oasSpread: 30,
            assetSwapSpread: 27,
            accrued: 0.7,
            notionalCurrency: Currency.USD,
            notionalAmount: 10000000,
            notional: '10M',
            trader: 'TRADER1',
            book: 'GOVT_BONDS',
            counterparty: 'BANK_A',
            bidPrice: 99.4,
            askPrice: 99.6,
            bidYield: 3.56,
            askYield: 3.54,
            bidSize: 5000000,
            offerSize: 8000000,
            lastTradePrice: 99.5,
            lastTradeSize: 2000000,
            lastTradeTime: new Date(),
            changeFromPrevClose: 0.2,
            percentageChange: 0.2,
            status: TradingStatus.ACTIVE,
            marketSector: 'Government',
            rating: CreditRating.AAA,
            liquidityScore: 9,
            lastUpdate: new Date()
        };
        // Create a mock callback
        const mockCallback = vi.fn();
        // Subscribe to updates
        simulator.subscribeToUpdates(mockCallback);
        // Add the instrument
        simulator.addInstrument(testBond);
        // Start the simulator
        simulator.start();
        // Reset the mock
        mockCallback.mockReset();
        // Advance timers to trigger an update
        vi.advanceTimersByTime(200);
        // Verify callback was called
        expect(mockCallback).toHaveBeenCalled();
        // Reset the mock again
        mockCallback.mockReset();
        // Stop the simulator
        simulator.stop();
        // Advance timers again
        vi.advanceTimersByTime(500);
        // Verify callback was not called after stopping
        expect(mockCallback).not.toHaveBeenCalled();
    });
});
