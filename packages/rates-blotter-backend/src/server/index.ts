import { RatesBlotterServer } from './server';
import { ServerConfig } from '../types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Load configuration from environment variables
    const config: ServerConfig = {
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || '0.0.0.0',
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      corsOrigins: process.env.CORS_ORIGINS || true,
      marketUpdateInterval: parseInt(process.env.MARKET_UPDATE_INTERVAL || '1000'),
      marketScenario: (process.env.MARKET_SCENARIO as any) || 'normal',
      volatilityMultiplier: parseFloat(process.env.VOLATILITY_MULTIPLIER || '1.0'),
      maxUpdatesPerSecond: parseInt(process.env.MAX_UPDATES_PER_SECOND || '10'),
      bucketSize: parseInt(process.env.BUCKET_SIZE || '20')
    };

    // Create server instance
    const server = new RatesBlotterServer(config);

    // Initialize and start the server
    await server.initialize();
    await server.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Shutting down server...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
main();