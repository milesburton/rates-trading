import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Instrument, DeltaUpdate } from '../types';

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
}

export interface FlashState {
  [instrumentId: string]: {
    [field: string]: 'up' | 'down';
  };
}

const FLASH_DURATION_MS = 600;

export function useBlotter() {
  const [instruments, setInstruments] = useState<Map<string, Instrument>>(new Map());
  const [connection, setConnection] = useState<ConnectionState>({ status: 'connecting' });
  const [flash, setFlash] = useState<FlashState>({});
  const socketRef = useRef<Socket | null>(null);
  const prevValuesRef = useRef<Map<string, Record<string, number>>>(new Map());

  const applyFlash = useCallback((instrumentId: string, fields: Record<string, unknown>) => {
    const numericFlashFields = ['bidPrice', 'askPrice', 'bidYield', 'askYield', 'currentPrice', 'fixedRate', 'yieldToMaturity', 'currentMtm', 'impliedVol', 'delta'];
    const prev = prevValuesRef.current.get(instrumentId) ?? {};
    const newFlash: Record<string, 'up' | 'down'> = {};

    for (const field of numericFlashFields) {
      if (field in fields && typeof fields[field] === 'number') {
        const newVal = fields[field] as number;
        const oldVal = prev[field];
        if (oldVal !== undefined && newVal !== oldVal) {
          newFlash[field] = newVal > oldVal ? 'up' : 'down';
        }
        prev[field] = newVal;
      }
    }

    prevValuesRef.current.set(instrumentId, prev);

    if (Object.keys(newFlash).length > 0) {
      setFlash(f => ({ ...f, [instrumentId]: { ...(f[instrumentId] ?? {}), ...newFlash } }));
      setTimeout(() => {
        setFlash(f => {
          const updated = { ...f };
          if (updated[instrumentId]) {
            const cleared = { ...updated[instrumentId] };
            for (const field of Object.keys(newFlash)) {
              delete cleared[field];
            }
            if (Object.keys(cleared).length === 0) {
              delete updated[instrumentId];
            } else {
              updated[instrumentId] = cleared;
            }
          }
          return updated;
        });
      }, FLASH_DURATION_MS);
    }
  }, []);

  useEffect(() => {
    const socket = io('/', {
      transports: ['websocket'],
      path: '/socket.io',
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnection({ status: 'connected' });

      socket.emit('subscribe', { instrumentIds: [] }, (response: { subscriptionId: string; instruments: Instrument[] }) => {
        if (response?.instruments) {
          const map = new Map<string, Instrument>();
          const initPrev = new Map<string, Record<string, number>>();

          for (const inst of response.instruments) {
            map.set(inst.instrumentId, inst);
            const numericFields: Record<string, number> = {};
            for (const [k, v] of Object.entries(inst)) {
              if (typeof v === 'number') numericFields[k] = v;
            }
            initPrev.set(inst.instrumentId, numericFields);
          }

          prevValuesRef.current = initPrev;
          setInstruments(map);
        }
      });
    });

    socket.on('instrument-update', (updates: DeltaUpdate[]) => {
      setInstruments(prev => {
        const next = new Map(prev);
        for (const update of updates) {
          const existing = next.get(update.instrumentId);
          if (existing) {
            next.set(update.instrumentId, { ...existing, ...update.fields } as Instrument);
            applyFlash(update.instrumentId, update.fields);
          }
        }
        return next;
      });
    });

    socket.on('disconnect', () => setConnection({ status: 'disconnected' }));
    socket.on('connect_error', (err) => setConnection({ status: 'error', error: err.message }));

    return () => {
      socket.disconnect();
    };
  }, [applyFlash]);

  return { instruments: Array.from(instruments.values()), connection, flash };
}
