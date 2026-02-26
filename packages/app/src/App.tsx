import React from 'react';
import { useBlotter } from './hooks/useBlotter';
import { StatusBar } from './components/StatusBar';
import { RatesBlotter } from './components/RatesBlotter';

export default function App() {
  const { instruments, connection, flash } = useBlotter();

  return (
    <div className="app">
      <StatusBar connection={connection} instrumentCount={instruments.length} />
      <RatesBlotter instruments={instruments} flash={flash} />
    </div>
  );
}
