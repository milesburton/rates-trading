# Rates Blotter Server

A real-time server for financial instrument data, providing live market updates for fixed income securities.

## Features

- **Real-time market data** for bonds, swaps, futures, and options
- **REST API** for instrument queries
- **Socket.IO** for real-time data streaming
- **Client-side backpressure** using token bucket algorithm
- **Server-side filtering** with json-logic-js
- **Configurable market scenarios** for testing and demonstrations
- **Comprehensive test suite** including integration and performance tests

## Project Structure

- `src/` - Source code
  - `models/` - TypeScript interfaces for financial instruments
  - `utils/` - Utility functions
  - `tests/` - Test suite
- `dist/` - Compiled JavaScript (generated)

## Prerequisites

- Node.js 16+
- npm or pnpm

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
pnpm install
```

3. Create a `.env` file based on `.env.example`

## Development

Start the development server with auto-reload:

```bash
npm run dev
# or
pnpm dev
```

## Building

Compile the TypeScript code:

```bash
npm run build
# or
pnpm build
```

## Running

Start the server:

```bash
npm start
# or
pnpm start
```

## Testing

Run all tests:

```bash
npm test
# or
pnpm test
```

Run integration tests:

```bash
npm run test:integration
# or
pnpm test:integration
```

Run performance tests:

```bash
npm run test:performance
# or
pnpm test:performance
```

## API Documentation

### REST Endpoints

- `GET /health` - Health check
- `GET /api/instruments` - Get all instruments
- `GET /api/instruments/:id` - Get a specific instrument by ID
- `GET /api/instruments/by-type?type=X` - Get instruments by security type
- `GET /api/instruments/by-currency?currency=X` - Get instruments by currency

### Socket.IO Events

#### Client to Server

- `subscribe` - Subscribe to instrument updates

  ```typescript
  {
    instrumentIds: string[],
    filter?: FilterExpression,
    updateFrequency?: number
  }
  ```

- `unsubscribe` - Unsubscribe from updates
  ```typescript
  subscriptionId: string;
  ```

#### Server to Client

- `initial-data` - Initial instrument data

  ```typescript
  {
    subscriptionId: string,
    instruments: Instrument[]
  }
  ```

- `instrument-update` - Delta update for an instrument
  ```typescript
  {
    instrumentId: string,
    timestamp: number,
    fields: Record<string, any>
  }
  ```

## Configuration

The server can be configured using environment variables:

| Variable               | Description                                                    | Default |
| ---------------------- | -------------------------------------------------------------- | ------- |
| PORT                   | Server port                                                    | 3000    |
| HOST                   | Server host                                                    | 0.0.0.0 |
| LOG_LEVEL              | Logging level (debug, info, warn, error)                       | info    |
| CORS_ORIGINS           | Allowed CORS origins                                           | \*      |
| MARKET_UPDATE_INTERVAL | Market update interval in ms                                   | 1000    |
| MARKET_SCENARIO        | Market scenario (normal, highVolatility, trending, flashEvent) | normal  |
| VOLATILITY_MULTIPLIER  | Volatility multiplier                                          | 1.0     |
| MAX_UPDATES_PER_SECOND | Maximum updates per second per client                          | 10      |
| BUCKET_SIZE            | Token bucket size for rate limiting                            | 20      |

## License

MIT