import { FastifyInstance } from "fastify";
import { InstrumentManager } from "./instrumentManager";
import {
  Instrument,
  SecurityType,
  Currency,
  TradingStatus,
  CreditRating,
} from "../models/instrument";

/**
 * Configure all REST routes for the application
 */
export function configureRoutes(
  fastify: FastifyInstance,
  instrumentManager: InstrumentManager
): void {
  // Health check endpoint
  fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Get all instruments
  fastify.get("/api/instruments", async (request, reply) => {
    const instruments = instrumentManager.getAllInstruments();
    return { instruments, count: instruments.length };
  });

  // Get a single instrument by ID
  fastify.get<{ Params: { instrumentId: string } }>(
    "/api/instruments/:instrumentId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            instrumentId: { type: "string" },
          },
          required: ["instrumentId"],
        },
      },
    },
    async (request, reply) => {
      const { instrumentId } = request.params;
      const instrument = instrumentManager.getInstrument(instrumentId);

      if (!instrument) {
        reply.code(404);
        return {
          success: false,
          error: "Instrument not found",
        };
      }

      return instrument;
    }
  );

  // Get instruments by type
  fastify.get<{ Querystring: { type: string } }>(
    "/api/instruments/by-type",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            type: { type: "string" },
          },
          required: ["type"],
        },
      },
    },
    async (request, reply) => {
      const { type } = request.query;

      // Validate security type
      if (!Object.values(SecurityType).includes(type as SecurityType)) {
        reply.code(400);
        return {
          success: false,
          error: "Invalid security type",
          data: { validTypes: Object.values(SecurityType) },
        };
      }

      const instruments = instrumentManager.getInstrumentsByType(
        type as SecurityType
      );
      return { instruments, count: instruments.length };
    }
  );

  // Get instruments by currency
  fastify.get<{ Querystring: { currency: string } }>(
    "/api/instruments/by-currency",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            currency: { type: "string" },
          },
          required: ["currency"],
        },
      },
    },
    async (request, reply) => {
      const { currency } = request.query;

      // Validate currency
      if (!Object.values(Currency).includes(currency as Currency)) {
        reply.code(400);
        return {
          success: false,
          error: "Invalid currency",
          data: { validCurrencies: Object.values(Currency) },
        };
      }

      const instruments = instrumentManager.getInstrumentsByCurrency(
        currency as Currency
      );
      return { instruments, count: instruments.length };
    }
  );

  // Get instruments by status
  fastify.get<{ Querystring: { status: string } }>(
    "/api/instruments/by-status",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            status: { type: "string" },
          },
          required: ["status"],
        },
      },
    },
    async (request, reply) => {
      const { status } = request.query;

      // Validate status
      if (!Object.values(TradingStatus).includes(status as TradingStatus)) {
        reply.code(400);
        return {
          success: false,
          error: "Invalid trading status",
          data: { validStatuses: Object.values(TradingStatus) },
        };
      }

      const instruments = instrumentManager.getInstrumentsByStatus(
        status as TradingStatus
      );
      return { instruments, count: instruments.length };
    }
  );

  // Get instruments by rating
  fastify.get<{ Querystring: { rating: string } }>(
    "/api/instruments/by-rating",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            rating: { type: "string" },
          },
          required: ["rating"],
        },
      },
    },
    async (request, reply) => {
      const { rating } = request.query;

      // Validate rating
      if (!Object.values(CreditRating).includes(rating as CreditRating)) {
        reply.code(400);
        return {
          success: false,
          error: "Invalid credit rating",
          data: { validRatings: Object.values(CreditRating) },
        };
      }

      // Filter instruments by rating
      const instruments = instrumentManager
        .getAllInstruments()
        .filter((instrument) => instrument.rating === rating);

      return { instruments, count: instruments.length };
    }
  );

  // Add a new instrument (admin operation)
  fastify.post<{ Body: any }>(
    "/api/admin/instruments",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            instrumentId: { type: "string" },
            securityType: { type: "string" },
            description: { type: "string" },
            notionalCurrency: { type: "string" },
            notionalAmount: { type: "number" },
            status: { type: "string" },
          },
          required: [
            "instrumentId",
            "securityType",
            "description",
            "notionalCurrency",
          ],
        },
      },
    },
    async (request, reply) => {
      const requestData = request.body as Instrument;

      // Check if instrument already exists
      if (instrumentManager.getInstrument(requestData.instrumentId)) {
        reply.code(409);
        return {
          success: false,
          error: "Instrument with this ID already exists",
        };
      }

      // Set default values for required fields if not provided
      const now = new Date();
      const instrument: Instrument = {
        instrumentId: requestData.instrumentId,
        description: requestData.description,
        notionalCurrency: requestData.notionalCurrency as Currency,
        notionalAmount: requestData.notionalAmount || 0,
        notional:
          requestData.notional ||
          formatNotional(requestData.notionalAmount || 0),
        trader: requestData.trader || "",
        book: requestData.book || "",
        counterparty: requestData.counterparty || "",
        bidPrice: requestData.bidPrice || 0,
        askPrice: requestData.askPrice || 0,
        bidYield: requestData.bidYield || 0,
        askYield: requestData.askYield || 0,
        bidSize: requestData.bidSize || 0,
        offerSize: requestData.offerSize || 0,
        lastTradePrice: requestData.lastTradePrice || 0,
        lastTradeSize: requestData.lastTradeSize || 0,
        lastTradeTime: requestData.lastTradeTime || now,
        changeFromPrevClose: requestData.changeFromPrevClose || 0,
        percentageChange: requestData.percentageChange || 0,
        status: (requestData.status as TradingStatus) || TradingStatus.ACTIVE,
        marketSector: requestData.marketSector || "",
        rating: (requestData.rating as CreditRating) || CreditRating.NOT_RATED,
        liquidityScore: requestData.liquidityScore || 5,
        lastUpdate: now,
      };

      instrumentManager.addInstrument(instrument);

      reply.code(201);
      return {
        success: true,
        data: instrument,
      };
    }
  );

  // Update an existing instrument (admin operation)
  fastify.put<{ Params: { instrumentId: string }; Body: any }>(
    "/api/admin/instruments/:instrumentId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            instrumentId: { type: "string" },
          },
          required: ["instrumentId"],
        },
      },
    },
    async (request, reply) => {
      const { instrumentId } = request.params;
      const updateData = request.body as Instrument;

      // Prepare updates with proper type conversions
      const updates: Partial<Instrument> = {};

      // Process standard fields with appropriate type conversions
      if (updateData.securityType)
        updates.securityType = updateData.securityType as SecurityType;
      if (updateData.description) updates.description = updateData.description;
      if (updateData.notionalCurrency)
        updates.notionalCurrency = updateData.notionalCurrency as Currency;
      if (updateData.notionalAmount) {
        updates.notionalAmount = updateData.notionalAmount;
        updates.notional = formatNotional(updateData.notionalAmount);
      }
      if (updateData.status)
        updates.status = updateData.status as TradingStatus;
      if (updateData.rating) updates.rating = updateData.rating as CreditRating;

      // Include all other properties from updateData
      Object.keys(updateData).forEach((key) => {
        if (
          ![
            "securityType",
            "description",
            "notionalCurrency",
            "notionalAmount",
            "status",
            "rating",
          ].includes(key)
        ) {
          updates[key] = updateData[key];
        }
      });

      // Always update the lastUpdate timestamp
      updates.lastUpdate = new Date();

      const updated = instrumentManager.updateInstrument(instrumentId, updates);

      if (!updated) {
        reply.code(404);
        return {
          success: false,
          error: "Instrument not found",
        };
      }

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Update instrument status
  fastify.patch<{ Params: { instrumentId: string }; Body: { status: string } }>(
    "/api/admin/instruments/:instrumentId/status",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            instrumentId: { type: "string" },
          },
          required: ["instrumentId"],
        },
        body: {
          type: "object",
          properties: {
            status: { type: "string" },
          },
          required: ["status"],
        },
      },
    },
    async (request, reply) => {
      const { instrumentId } = request.params;
      const { status } = request.body;

      // Validate status
      if (!Object.values(TradingStatus).includes(status as TradingStatus)) {
        reply.code(400);
        return {
          success: false,
          error: "Invalid trading status",
          data: { validStatuses: Object.values(TradingStatus) },
        };
      }

      const instrument = instrumentManager.getInstrument(instrumentId);

      if (!instrument) {
        reply.code(404);
        return {
          success: false,
          error: "Instrument not found",
        };
      }

      // Update the status
      const previousStatus = instrument.status;
      const updated = instrumentManager.updateInstrument(instrumentId, {
        status: status as TradingStatus,
        lastUpdate: new Date(),
      });

      return {
        success: true,
        message: `Status updated from ${previousStatus} to ${status}`,
        data: updated,
      };
    }
  );

  // Delete an instrument (admin operation)
  fastify.delete<{ Params: { instrumentId: string } }>(
    "/api/admin/instruments/:instrumentId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            instrumentId: { type: "string" },
          },
          required: ["instrumentId"],
        },
      },
    },
    async (request, reply) => {
      const { instrumentId } = request.params;

      const deleted = instrumentManager.removeInstrument(instrumentId);

      if (!deleted) {
        reply.code(404);
        return {
          success: false,
          error: "Instrument not found",
        };
      }

      return {
        success: true,
        message: `Instrument ${instrumentId} successfully deleted`,
      };
    }
  );

  // Create example instruments (for testing)
  fastify.post("/api/admin/create-examples", async (request, reply) => {
    const instruments = instrumentManager.createExampleInstruments();
    reply.code(201);
    return {
      success: true,
      data: { count: instruments.length },
    };
  });

  // Get server status
  fastify.get("/api/status", async () => {
    const instruments = instrumentManager.getAllInstruments();

    return {
      status: "running",
      timestamp: new Date().toISOString(),
      instrumentCount: instruments.length,
      uptime: process.uptime(),
    };
  });

  // Get supported security types
  fastify.get("/api/security-types", async () => {
    return {
      securityTypes: Object.values(SecurityType),
    };
  });

  // Get supported currencies
  fastify.get("/api/currencies", async () => {
    return {
      currencies: Object.values(Currency),
    };
  });

  // Get supported trading statuses
  fastify.get("/api/trading-statuses", async () => {
    return {
      tradingStatuses: Object.values(TradingStatus),
    };
  });

  // Get supported credit ratings
  fastify.get("/api/credit-ratings", async () => {
    return {
      creditRatings: Object.values(CreditRating),
    };
  });
}

/**
 * Helper function to format notional amount into a human-readable string
 */
function formatNotional(amount: number): string {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  } else {
    return amount.toString();
  }
}
