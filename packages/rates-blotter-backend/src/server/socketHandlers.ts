import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { InstrumentManager } from './instrumentManager';
import { MarketSimulator } from './marketSimulator';
import { ClientManager } from './clientManager';
import { SubscriptionRequest, DeltaUpdate, BatchUpdate } from '../types';
import jsonLogic from 'json-logic-js';

/**
 * Configure Socket.IO handlers for real-time updates
 */
export function configureSocketHandlers(
  io: Server,
  instrumentManager: InstrumentManager,
  marketSimulator: MarketSimulator,
  clientManager: ClientManager
): void {
  // When market data changes, notify relevant clients
  marketSimulator.onUpdate((updates: DeltaUpdate[]) => {
    // Process each update
    for (const update of updates) {
      const { instrumentId } = update;
      const instrument = instrumentManager.getInstrument(instrumentId);

      if (!instrument) continue;

      // Get clients subscribed to this instrument
      const clients = clientManager.getClientsForInstrument(instrumentId);

      // Send update to each client if they pass filter and rate limits
      for (const client of clients) {
        // Check if this client can receive updates (token bucket)
        if (!clientManager.canSendUpdate(client.id, instrumentId)) {
          continue;
        }

        // Check if enough time has passed since last update
        if (!clientManager.shouldSendUpdate(client.id, instrumentId)) {
          continue;
        }

        // Check if this update passes any filters for this client's subscriptions
        let sendUpdate = false;

        for (const subscription of client.subscriptions.values()) {
          if (subscription.instrumentIds.includes(instrumentId)) {
            if (clientManager.passesFilter(instrument, subscription.filters)) {
              sendUpdate = true;
              break;
            }
          }
        }

        if (sendUpdate) {
          // Send the update to this client
          io.to(client.id).emit('instrument-update', update);
        }
      }
    }
  });

  // Handle client connections
  io.on('connection', (socket: Socket) => {
    const clientId = socket.id;
    console.log(`Client connected: ${clientId}`);

    // Register the client
    clientManager.registerClient(clientId);

    // Handle subscription requests
    socket.on('subscribe', (request: SubscriptionRequest, callback) => {
      try {
        // Generate a unique subscription ID
        const subscriptionId = uuidv4();

        // Add the subscription for this client
        clientManager.addSubscription(clientId, subscriptionId, {
          instrumentIds: request.instrumentIds,
          filters: request.filter,
          updateFrequency: request.updateFrequency
        });

        // Send initial data for all requested instruments
        const initialData = request.instrumentIds
          .map(id => instrumentManager.getInstrument(id))
          .filter(instrument => instrument !== undefined)
          .filter(instrument => {
            // Apply filter if provided
            if (request.filter && instrument) {
              try {
                return jsonLogic.apply(request.filter, instrument);
              } catch (err) {
                console.error('Error evaluating filter:', err);
                return false;
              }
            }
            return true;
          });

        // Send the initial data to the client
        socket.emit('initial-data', {
          subscriptionId,
          instruments: initialData
        });

        // Send success response to the client
        if (callback) {
          callback({
            success: true,
            subscriptionId,
            message: `Subscribed to ${initialData.length} instruments`
          });
        }
      } catch (error) {
        console.error('Error processing subscription:', error);
        if (callback) {
          callback({
            success: false,
            message: 'Failed to process subscription'
          });
        }
      }
    });

    // Handle unsubscribe requests
    socket.on('unsubscribe', (subscriptionId: string, callback) => {
      try {
        clientManager.removeSubscription(clientId, subscriptionId);

        if (callback) {
          callback({
            success: true,
            message: 'Successfully unsubscribed'
          });
        }
      } catch (error) {
        console.error('Error unsubscribing:', error);
        if (callback) {
          callback({
            success: false,
            message: 'Failed to unsubscribe'
          });
        }
      }
    });

    // Handle client disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${clientId}`);
      clientManager.unregisterClient(clientId);
    });
  });
}