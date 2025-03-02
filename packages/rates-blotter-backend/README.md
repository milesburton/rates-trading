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
