import Fastify, { FastifyInstance } from 'fastify';
import fastifyIO from 'fastify-socket.io';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { MarketSimulator } from './marketSimulator';
import { InstrumentManager } from './instrumentManager';
import { ClientManager } from './clientManager';
import { configureRoutes } from './routes';
import { configureSocketHandlers } from './socketHandlers';
import { ServerConfig } from '../types';

export class RatesBlotterServer {
  private fastify: FastifyInstance;
  private io: Server;
  private marketSimulator: MarketSimulator;
  private instrumentManager: InstrumentManager;
  private clientManager: ClientManager;

  constructor(private config: ServerConfig) {
    // Initialize Fastify with logging configuration
    this.fastify = Fastify({
      logger: {
        level: config.logLevel || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      },
    });

    // Initialize core components
    this.instrumentManager = new InstrumentManager();
    this.marketSimulator = new MarketSimulator(
      this.instrumentManager,
      {
        updateInterval: config.marketUpdateInterval || 1000,
        scenario: config.marketScenario || 'normal',
        volatilityMultiplier: config.volatilityMultiplier || 1.0,
      }
    );

    this.clientManager = new ClientManager({
      maxUpdatesPerSecond: config.maxUpdatesPerSecond || 10,
      bucketSize: config.bucketSize || 20,
    });
  }

  async initialize(): Promise<void> {
    // Register plugins
    await this.fastify.register(cors, {
      origin: this.config.corsOrigins || true
    });

    await this.fastify.register(fastifyIO, {
      cors: {
        origin: this.config.corsOrigins || true,
        methods: ["GET", "POST"]
      }
    });

    // Get Socket.IO instance
    this.io = this.fastify.io;

    // Configure routes and socket handlers
    configureRoutes(this.fastify, this.instrumentManager);
    configureSocketHandlers(
      this.io,
      this.instrumentManager,
      this.marketSimulator,
      this.clientManager
    );

    // Initialize market simulator
    await this.marketSimulator.initialize();

    this.fastify.log.info('Server initialized successfully');
  }

  async start(): Promise<void> {
    try {
      const address = await this.fastify.listen({
        port: this.config.port || 3000,
        host: this.config.host || '0.0.0.0'
      });

      // Start the market simulator
      this.marketSimulator.start();

      this.fastify.log.info(`Server is running on ${address}`);
    } catch (err) {
      this.fastify.log.error(err);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    this.marketSimulator.stop();
    await this.fastify.close();
    this.fastify.log.info('Server stopped');
  }
}