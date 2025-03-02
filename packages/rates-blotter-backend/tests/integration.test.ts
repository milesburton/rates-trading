import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { RatesBlotterServer } from '../src/server/server';
import { ServerConfig } from '../src/types';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

describe('Rates Blotter Server Integration Tests', () => {
  // Server instance
  let server: RatesBlotterServer;

  // Configuration for test server
  const testConfig: ServerConfig = {
    port: 3001,
    host: 'localhost',
    logLevel: 'error',
    corsOrigins: true,
    marketUpdateInterval: 100, // Faster updates for testing
    marketScenario: 'normal',
    volatilityMultiplier: 0.5, // Lower volatility for predictable tests
    maxUpdatesPerSecond: 20,
    bucketSize: 40
  };

  // API base URL
  const API_URL = `http://${testConfig.host}:${testConfig.port}`;

  // Setup before all tests
  beforeAll(async () => {
    // Create and start server
    server = new RatesBlotterServer(testConfig);
    await server.initialize();
    await server.start();

    // Give server time to initialize completely
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  // Cleanup after all tests
  afterAll(async () => {
    await server.stop();
  });

  // Test health check endpoint
  it('should respond to health check', async () => {
    const response = await axios.get(`${API_URL}/health`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('ok');
  });

  // Test getting all instruments
  it('should return all instruments', async () => {
    const response = await axios.get(`${API_URL}/api/instruments`);
    expect(response.status).toBe(200);
    expect(response.data.instruments).toBeInstanceOf(Array);
    expect(response.data.instruments.length).toBeGreaterThan(0);
  });

  // Test getting a single instrument
  it('should return a single instrument by ID', async () => {
    // First get all instruments to find a valid ID
    const allResponse = await axios.get(`${API_URL}/api/instruments`);
    const firstInstrument = allResponse.data.instruments[0];

    // Now get the specific instrument
    const response = await axios.get(`${API_URL}/api/instruments/${firstInstrument.id}`);

    expect(response.status).toBe(200);
    expect(response.data.id).toBe(firstInstrument.id);
    expect(response.data.name).toBe(firstInstrument.name);
  });

  // Test getting instruments by type
  it('should return instruments by type', async () => {
    // First get all instruments to find valid types
    const allResponse = await axios.get(`${API_URL}/api/instruments`);
    const firstInstrument = allResponse.data.instruments[0];

    // Now get instruments of that type
    const response = await axios.get(`${API_URL}/api/instruments/by-type?type=${firstInstrument.securityType}`);

    expect(response.status).toBe(200);
    expect(response.data.instruments).toBeInstanceOf(Array);
    expect(response.data.instruments.length).toBeGreaterThan(0);
    expect(response.data.instruments[0].securityType).toBe(firstInstrument.securityType);
  });

  // Socket.IO tests
  describe('Socket.IO Real-time Updates', () => {
    let socket: Socket;

    // Setup before each test
    beforeEach(() => {
      // Create a new socket connection
      socket = io(`http://${testConfig.host}:${testConfig.port}`, {
        transports: ['websocket'],
        forceNew: true
      });
    });

    // Cleanup after each test
    afterAll(() => {
      if (socket && socket.connected) {
        socket.disconnect();
      }
    });

    // Test basic connection
    it('should establish a socket connection', (done) => {
      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        done();
      });
    });

    // Test subscription
    it('should subscribe to instruments and receive updates', (done) => {
      let initialDataReceived = false;
      let updateReceived = false;

      // Get instrument IDs first
      axios.get(`${API_URL}/api/instruments`)
        .then(response => {
          const instrumentIds = response.data.instruments.slice(0, 2).map(i => i.id);

          // Setup event handlers
          socket.on('connect', () => {
            // Subscribe to the instruments
            socket.emit('subscribe', { instrumentIds }, (response) => {
              expect(response.success).toBe(true);
              expect(response.subscriptionId).toBeDefined();
            });
          });

          socket.on('initial-data', (data) => {
            initialDataReceived = true;
            expect(data.subscriptionId).toBeDefined();
            expect(data.instruments).toBeInstanceOf(Array);
            expect(data.instruments.length).toBeGreaterThanOrEqual(1);
          });

          socket.on('instrument-update', (update) => {
            updateReceived = true;
            expect(update.instrumentId).toBeDefined();
            expect(update.timestamp).toBeDefined();
            expect(update.fields).toBeDefined();

            // If we've received both initial data and at least one update, the test is done
            if (initialDataReceived && updateReceived) {
              done();
            }
          });

          // Set a timeout in case updates don't come through
          setTimeout(() => {
            if (!initialDataReceived || !updateReceived) {
              done(new Error('Did not receive expected data within timeout'));
            }
          }, 5000); // 5 second timeout
        });
    });

    // Test filtering
    it('should apply filters to subscriptions', (done) => {
      // Get instrument IDs first
      axios.get(`${API_URL}/api/instruments`)
        .then(response => {
          const instruments = response.data.instruments;
          const instrumentIds = instruments.map(i => i.id);

          // Create a filter for bonds only
          const filter = {
            "==": [
              { "var": "securityType" },
              "GOVERNMENT_BOND"
            ]
          };

          // Subscribe with the filter
          socket.emit('subscribe', { instrumentIds, filter }, (response) => {
            expect(response.success).toBe(true);
          });

          socket.on('initial-data', (data) => {
            expect(data.instruments).toBeInstanceOf(Array);

            // Check that all instruments in the response match the filter
            for (const instrument of data.instruments) {
              expect(instrument.securityType).toBe('GOVERNMENT_BOND');
            }

            done();
          });

          // Set a timeout in case initial data doesn't come through
          setTimeout(() => {
            done(new Error('Did not receive initial data within timeout'));
          }, 5000); // 5 second timeout
        });
    });

    // Test unsubscribe
    it('should unsubscribe from instruments', (done) => {
      let subscriptionId: string;
      let updateCount = 0;

      // Get instrument IDs first
      axios.get(`${API_URL}/api/instruments`)
        .then(response => {
          const instrumentIds = response.data.instruments.slice(0, 1).map(i => i.id);

          // Subscribe to the instruments
          socket.emit('subscribe', { instrumentIds }, (response) => {
            expect(response.success).toBe(true);
            subscriptionId = response.subscriptionId;

            // Wait for a couple of updates
            socket.on('instrument-update', (update) => {
              updateCount++;

              // After receiving 2 updates, unsubscribe
              if (updateCount === 2) {
                socket.emit('unsubscribe', subscriptionId, (response) => {
                  expect(response.success).toBe(true);

                  // Wait a moment to ensure no more updates are received
                  setTimeout(() => {
                    // Check that we're still at 2 updates
                    expect(updateCount).toBe(2);
                    done();
                  }, 1000);
                });
              }

              // If we get more than 2 updates after unsubscribing, fail the test
              if (updateCount > 2) {
                done(new Error('Received updates after unsubscribing'));
              }
            });
          });

          // Set a timeout in case updates don't come through
          setTimeout(() => {
            done(new Error('Did not receive expected updates within timeout'));
          }, 10000); // 10 second timeout
        });
    });
  });
});