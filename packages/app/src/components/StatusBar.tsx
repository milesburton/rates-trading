import React from 'react';
import { ConnectionState } from '../hooks/useBlotter';

interface Props {
  connection: ConnectionState;
  instrumentCount: number;
}

export function StatusBar({ connection, instrumentCount }: Props) {
  const dot = {
    connecting:   '#f59e0b',
    connected:    '#22c55e',
    disconnected: '#ef4444',
    error:        '#ef4444',
  }[connection.status];

  const label = {
    connecting:   'Connecting…',
    connected:    'Live',
    disconnected: 'Disconnected',
    error:        `Error: ${connection.error ?? 'unknown'}`,
  }[connection.status];

  return (
    <div className="status-bar">
      <span className="app-title">Rates Blotter</span>
      <span className="status-group">
        <span className="status-dot" style={{ background: dot }} />
        <span className="status-label">{label}</span>
        {connection.status === 'connected' && (
          <span className="instrument-count">{instrumentCount} instruments</span>
        )}
      </span>
    </div>
  );
}
