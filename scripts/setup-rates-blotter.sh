#!/usr/bin/env bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print section header
section() {
  echo -e "\n${BLUE}▶ $1${NC}"
}

# Print success message
success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Make sure we're in the root directory
if [ ! -f "package.json" ] || [ ! -f "pnpm-workspace.yaml" ]; then
  echo "Error: Please run this script from the project root directory"
  exit 1
fi

section "Creating rates-blotter-backend package"

# Create package directory if it doesn't exist
if [ ! -d "packages/rates-blotter-backend" ]; then
  mkdir -p packages/rates-blotter-backend
  mkdir -p packages/rates-blotter-backend/src/{models,simulator,server,utils}
  mkdir -p packages/rates-blotter-backend/tests
  success "Created directory structure"
else
  echo "Directory already exists, will update files"
fi

# Create package.json
cat > packages/rates-blotter-backend/package.json << 'EOL'
{
  "name": "rates-blotter-backend",
  "version": "0.1.0",
  "description": "Backend for Fixed Income/Rates Trade Blotter",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint ."
  },
  "dependencies": {
    "fastify": "^4.26.0",
    "fastify-socket.io": "^5.0.0",
    "immer": "^10.0.3",
    "json-logic-js": "^2.0.2",
    "socket.io": "^4.7.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/json-logic-js": "^2.0.1",
    "@types/node": "^20.11.0",
    "eslint": "^8.56.0",
    "tsx": "^4.7.1",
    "typescript": "^5.4.0",
    "vitest": "^1.0.0"
  }
}
EOL
success "Created package.json"

# Create tsconfig.json
cat > packages/rates-blotter-backend/tsconfig.json << 'EOL'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*", "tests/**/*"]
}
EOL
success "Created tsconfig.json"

# Create instrument.ts
cat > packages/rates-blotter-backend/src/models/instrument.ts << 'EOL'
/**
 * Core instrument interfaces for the rates blotter
 * Based on the comprehensive instrument data model specified in requirements
 */

// Common enums used across instruments
export enum SecurityType {
  BOND = 'Bond',
  SWAP = 'Swap',
  FUTURE = 'Future',
  OPTION = 'Option',
}

export enum DayCountConvention {
  THIRTY_360 = '30/360',
  ACT_365 = 'ACT/365',
  ACT_360 = 'ACT/360',
  ACT_ACT = 'ACT/ACT',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  CHF = 'CHF',
  CAD = 'CAD',
  AUD = 'AUD',
}

export enum TradingStatus {
  ACTIVE = 'Active',
  SUSPENDED = 'Suspended',
  HALTED = 'Halted',
  CLOSED = 'Closed',
}

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
  CCC = 'CCC',
  CC = 'CC',
  C = 'C',
  D = 'D',
}

/**
 * Base interface for all financial instruments
 * Contains fields common to all instrument types
 */
export interface Instrument {
  instrumentId: string;         // Unique identifier (e.g., "US10Y", "UK5Y")
  securityType: SecurityType;   // Type of security
  description: string;          // Human-readable description
  notionalCurrency: Currency;   // Currency of notional
  notionalAmount: number;       // Actual notional value
  notional: string;             // Notional amount formatted (e.g., "10M")
  trader: string;               // Trader ID
  book: string;                 // Trading book/desk
  counterparty: string;         // Counterparty ID

  // Market data
  bidPrice: number;             // Bid price
  askPrice: number;             // Ask price
  bidYield: number;             // Bid yield
  askYield: number;             // Ask yield
  bidSize: number;              // Size available at bid
  offerSize: number;            // Size available at offer
  lastTradePrice: number;       // Last traded price
  lastTradeSize: number;        // Size of last trade
  lastTradeTime: Date;          // Time of last trade

  // Reference data
  changeFromPrevClose: number;  // Change from previous day's close
  percentageChange: number;     // Percentage change from previous day
  status: TradingStatus;        // Trading status
  marketSector: string;         // Market sector/category
  rating: CreditRating;         // Credit rating
  liquidityScore: number;       // Measure of instrument liquidity (1-10)

  // Metadata
  lastUpdate: Date;             // Timestamp of last update
}

/**
 * Price/yield sensitivity metrics common to fixed income instruments
 */
export interface FixedIncomeSensitivityMetrics {
  duration: number;             // Modified duration
  convexity: number;            // Convexity measure
  dv01: number;                 // Dollar value of 01 (sensitivity to 1bp yield change)
  pv01: number;                 // Present value of 01
}

/**
 * Spread metrics common to fixed income instruments
 */
export interface SpreadMetrics {
  spread: number;               // Spread to benchmark in basis points
  zSpread: number;              // Zero-volatility spread in basis points
  oasSpread: number;            // Option-adjusted spread in basis points
  assetSwapSpread: number;      // Asset swap spread in basis points
}

/**
 * Date-related properties common to fixed income instruments
 */
export interface InstrumentDates {
  issueDate: Date;              // When the instrument was issued
  maturityDate: Date;           // When the instrument matures
  settlementDate: Date;         // When the trade settles
}
EOL
success "Created instrument.ts"

# Create rates.ts
cat > packages/rates-blotter-backend/src/models/rates.ts << 'EOL'
import {
  Instrument,
  SecurityType,
  DayCountConvention,
  FixedIncomeSensitivityMetrics,
  SpreadMetrics,
  InstrumentDates
} from './instrument';

/**
 * Bond instrument interface
 * Extends base instrument with bond-specific properties
 */
export interface Bond extends
  Instrument,
  FixedIncomeSensitivityMetrics,
  SpreadMetrics,
  InstrumentDates {

  securityType: SecurityType.BOND;
  isin: string;                  // International Securities Identification Number
  cusip: string;                 // CUSIP (for US securities)
  couponRate: number;            // Annual coupon rate percentage
  frequency: number;             // Coupon payment frequency per year (e.g., 2 for semi-annual)
  dayCountConvention: DayCountConvention;  // Day count method

  price: number;                 // Clean price
  dirtyPrice: number;            // Price including accrued interest
  yield: number;                 // Yield to maturity percentage
  yieldToWorst: number;          // Worst case yield scenario
  accrued: number;               // Accrued interest
}

/**
 * Interest Rate Swap interface
 * Extends base instrument with swap-specific properties
 */
export interface InterestRateSwap extends
  Instrument,
  FixedIncomeSensitivityMetrics,
  InstrumentDates {

  securityType: SecurityType.SWAP;
  fixedRate: number;             // Fixed leg rate
  floatingIndex: string;         // Floating rate index (e.g., "LIBOR", "SOFR")
  floatingSpread: number;        // Spread over floating index in basis points
  paymentFrequency: number;      // Payment frequency per year
  dayCountConvention: DayCountConvention;  // Day count method
  effectiveDate: Date;           // Start date of swap
  swapCurve: string;             // Reference curve for pricing
  fixedLegDV01: number;          // DV01 of fixed leg
  floatingLegDV01: number;       // DV01 of floating leg
  currentFloatingRate: number;   // Current floating rate value
  nextResetDate: Date;           // Date of next floating rate reset
  swapRate: number;              // Current mid-market swap rate
}

/**
 * Interest Rate Future interface
 * Extends base instrument with futures-specific properties
 */
export interface InterestRateFuture extends
  Instrument,
  FixedIncomeSensitivityMetrics {

  securityType: SecurityType.FUTURE;
  contractMonth: string;         // Contract month (e.g., "Mar24")
  underlyingRate: string;        // Underlying rate or index
  tickSize: number;              // Minimum price movement
  tickValue: number;             // Value of one tick
  contractSize: number;          // Size of one contract
  expiryDate: Date;              // Expiration date
  deliveryDate: Date;            // Delivery date (if physical)
  openInterest: number;          // Open interest
  impliedRate: number;           // Rate implied by future price
  basisToSpot: number;           // Basis to spot instrument
  deliverableInstruments: string[]; // List of deliverable instruments (if applicable)
}

/**
 * Interest Rate Option interface
 * Extends base instrument with option-specific properties
 */
export interface InterestRateOption extends
  Instrument,
  FixedIncomeSensitivityMetrics {

  securityType: SecurityType.OPTION;
  optionType: 'Call' | 'Put';    // Call or Put
  underlyingId: string;          // ID of underlying instrument
  strikePrice: number;           // Strike price
  expiryDate: Date;              // Expiration date
  exerciseStyle: 'European' | 'American' | 'Bermudan'; // Exercise style
  impliedVol: number;            // Implied volatility
  delta: number;                 // Delta Greeks
  gamma: number;                 // Gamma Greeks
  theta: number;                 // Theta Greeks
  vega: number;                  // Vega Greeks
  rho: number;                   // Rho Greeks
  premium: number;               // Option premium
  intrinsicValue: number;        // Intrinsic value
  timeValue: number;             // Time value
}

/**
 * Type definition for all rates instruments
 */
export type RatesInstrument = Bond | InterestRateSwap | InterestRateFuture | InterestRateOption;
EOL
success "Created rates.ts"

# Create models/index.ts
cat > packages/rates-blotter-backend/src/models/index.ts << 'EOL'
export * from './instrument';
export * from './rates';
EOL
success "Created models/index.ts"

# Create main index.ts
cat > packages/rates-blotter-backend/src/index.ts << 'EOL'
import { MarketSimulator, DEFAULT_CONFIG } from './simulator/marketSimulator';

// Simple initialization
console.log("🚀 Rates Blotter Backend Initialized");
console.log("Default market config:", DEFAULT_CONFIG);

// TODO: Setup server and market simulator
EOL
success "Created src/index.ts"

# Create a basic README.md
cat > packages/rates-blotter-backend/README.md << 'EOL'
# Rates Blotter Backend

This package implements the backend for a high-performance fixed income/rates trading blotter, including:

- Instrument data models for bonds, swaps, futures, and options
- Virtual market simulator for generating realistic market data
- Real-time update mechanism with field-level delta updates
- Server implementation with Fastify and Socket.IO

## Development

```bash
# From the project root
pnpm --filter rates-blotter-backend dev

# Run tests
pnpm --filter rates-blotter-backend test
```

## Architecture

The backend is structured into the following main components:

- **models/** - TypeScript interfaces defining the instrument data model
- **simulator/** - Virtual market simulator for generating realistic market data
- **server/** - Fastify server with Socket.IO for real-time updates
- **utils/** - Utility functions for delta updates, backpressure, etc.
EOL
success "Created README.md"

# Install dependencies at root level
section "Installing dependencies"
pnpm install
success "Dependencies installed"

# Create a test file
cat > packages/rates-blotter-backend/tests/models.test.ts << 'EOL'
import { describe, it, expect } from 'vitest';
import { SecurityType, Currency, TradingStatus, CreditRating } from '../src/models';

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
EOL
success "Created test file"

echo -e "\n${GREEN}✅ Rates blotter backend package setup complete!${NC}"
echo -e "You can now run:\n"
echo -e "  ${BLUE}cd packages/rates-blotter-backend${NC}"
echo -e "  ${BLUE}pnpm dev${NC}"
echo -e "\nOr from the project root:\n"
echo -e "  ${BLUE}pnpm --filter rates-blotter-backend dev${NC}"