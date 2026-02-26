import React, { useState } from 'react';
import { Instrument, SecurityType } from '../types';
import { FlashState } from '../hooks/useBlotter';
import { InstrumentRow } from './InstrumentRow';

interface Props {
  instruments: Instrument[];
  flash: FlashState;
}

type SortField = 'instrumentId' | 'securityType' | 'bidPrice' | 'askPrice' | 'percentageChange';

const TYPE_FILTERS: { label: string; value: SecurityType | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Bonds', value: 'GOVERNMENT_BOND' },
  { label: 'Corp', value: 'CORPORATE_BOND' },
  { label: 'Swaps', value: 'INTEREST_RATE_SWAP' },
  { label: 'Futures', value: 'FUTURE' },
  { label: 'Options', value: 'OPTION' },
];

export function RatesBlotter({ instruments, flash }: Props) {
  const [filter, setFilter] = useState<SecurityType | 'ALL'>('ALL');
  const [sort, setSort] = useState<{ field: SortField; dir: 1 | -1 }>({
    field: 'securityType',
    dir: 1,
  });

  const filtered = instruments.filter(i => filter === 'ALL' || i.securityType === filter);

  const sorted = [...filtered].sort((a, b) => {
    const av = (a as any)[sort.field];
    const bv = (b as any)[sort.field];
    if (typeof av === 'string') return sort.dir * av.localeCompare(bv);
    return sort.dir * ((av ?? 0) - (bv ?? 0));
  });

  function toggleSort(field: SortField) {
    setSort(s => s.field === field ? { field, dir: (s.dir * -1) as 1 | -1 } : { field, dir: 1 });
  }

  function SortTh({ field, children }: { field: SortField; children: React.ReactNode }) {
    const active = sort.field === field;
    return (
      <th onClick={() => toggleSort(field)} className={`sortable ${active ? 'active' : ''}`}>
        {children} {active ? (sort.dir === 1 ? '↑' : '↓') : ''}
      </th>
    );
  }

  return (
    <div className="blotter">
      <div className="blotter-toolbar">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.value}
            className={`filter-btn ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        <span className="row-count">{sorted.length} rows</span>
      </div>

      <div className="table-wrapper">
        <table className="blotter-table">
          <thead>
            <tr>
              <SortTh field="instrumentId">ID</SortTh>
              <SortTh field="securityType">Type</SortTh>
              <th>Description</th>
              <SortTh field="bidPrice">Bid</SortTh>
              <SortTh field="askPrice">Ask</SortTh>
              <th>Bid Yld</th>
              <th>Ask Yld</th>
              <th>Last</th>
              <SortTh field="percentageChange">Chg%</SortTh>
              <th>Bid Sz</th>
              <th>Ask Sz</th>
              <th colSpan={2}>Field 1</th>
              <th colSpan={2}>Field 2</th>
              <th>Trader</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(inst => (
              <InstrumentRow
                key={inst.instrumentId}
                instrument={inst}
                flash={flash[inst.instrumentId]}
              />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={16} className="empty-row">No instruments</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
