import { MarketSimulator, DEFAULT_CONFIG, NORMAL_MARKET } from './simulator';
import { Bond, SecurityType, Currency, TradingStatus, CreditRating, DayCountConvention } from './models';

// Create a simulator with default configuration
const simulator = new MarketSimulator(NORMAL_MARKET);

// Example bond for testing
const us10y: Bond = {
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

// UK 5-year Gilt
const uk5y: Bond = {
  instrumentId: 'UK5Y',
  securityType: SecurityType.BOND,
  description: 'UK 5 Year Gilt',
  isin: 'GB0009997999',
  cusip: '987654321',
  issueDate: new Date('2023-03-10'),
  maturityDate: new Date('2028-03-10'),
  settlementDate: new Date('2023-03-12'),
  couponRate: 4.0,
  frequency: 2,
  dayCountConvention: DayCountConvention.ACT_365,
  price: 101.2,
  dirtyPrice: 101.8,
  yield: 3.75,
  yieldToWorst: 3.75,
  duration: 4.6,
  convexity: 0.24,
  dv01: 0.046,
  pv01: 0.046,
  spread: 35,
  zSpread: 38,
  oasSpread: 40,
  assetSwapSpread: 37,
  accrued: 0.6,
  notionalCurrency: Currency.GBP,
  notionalAmount: 8000000,
  notional: '8M',
  trader: 'TRADER2',
  book: 'EU_GOVT_BONDS',
  counterparty: 'BANK_B',
  bidPrice: 101.1,
  askPrice: 101.3,
  bidYield: 3.76,
  askYield: 3.74,
  bidSize: 4000000,
  offerSize: 5000000,
  lastTradePrice: 101.2,
  lastTradeSize: 3000000,
  lastTradeTime: new Date(),
  changeFromPrevClose: -0.1,
  percentageChange: -0.1,
  status: TradingStatus.ACTIVE,
  marketSector: 'Government',
  rating: CreditRating.AA,
  liquidityScore: 8,
  lastUpdate: new Date()
};

// Subscribe to updates
const unsubscribe = simulator.subscribeToUpdates((id, update, isFullUpdate) => {
  const updateType = isFullUpdate ? 'FULL UPDATE' : 'DELTA UPDATE';
  console.log(`[${new Date().toISOString()}] ${updateType} for ${id}:`);
  console.log(JSON.stringify(update, null, 2));
});

// Add instruments to the simulator
simulator.addInstrument(us10y);
simulator.addInstrument(uk5y);

// Start the simulator
simulator.start();

console.log("🚀 Rates Blotter Backend Initialized");
console.log(`Monitoring ${simulator.getAllInstruments().length} instruments`);
console.log("Press Ctrl+C to exit");

// Prevent the Node.js process from exiting
process.stdin.resume();

// Handle exit gracefully
process.on('SIGINT', () => {
  console.log("\nStopping simulator...");
  simulator.stop();
  unsubscribe();
  console.log("Simulator stopped. Exiting.");
  process.exit(0);
});

// Export key components for external usage
export * from './models';
export * from './simulator';
export * from './utils';