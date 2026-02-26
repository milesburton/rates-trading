import React from 'react';
import { Instrument } from '../types';
import { FlashState } from '../hooks/useBlotter';

interface Props {
  instrument: Instrument;
  flash: FlashState[string] | undefined;
}

function fmt(n: number | undefined, decimals = 4): string {
  if (n === undefined || n === null || isNaN(n)) return '—';
  return n.toFixed(decimals);
}

function fmtPct(n: number): string {
  const s = n >= 0 ? `+${n.toFixed(2)}%` : `${n.toFixed(2)}%`;
  return s;
}

function fmtSize(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function cellClass(field: string, flash: FlashState[string] | undefined): string {
  const dir = flash?.[field];
  if (dir === 'up') return 'flash-up';
  if (dir === 'down') return 'flash-down';
  return '';
}

function typeLabel(securityType: string): string {
  const map: Record<string, string> = {
    GOVERNMENT_BOND:   'GOV',
    CORPORATE_BOND:    'CORP',
    INTEREST_RATE_SWAP:'IRS',
    FUTURE:            'FUT',
    OPTION:            'OPT',
  };
  return map[securityType] ?? securityType;
}

export function InstrumentRow({ instrument: inst, flash }: Props) {
  const pctClass = inst.percentageChange >= 0 ? 'positive' : 'negative';

  // Extract instrument-specific fields
  let price: number | undefined;
  let yieldVal: number | undefined;
  let extra1Label = '';
  let extra1Val = '';
  let extra2Label = '';
  let extra2Val = '';

  if (inst.securityType === 'GOVERNMENT_BOND' || inst.securityType === 'CORPORATE_BOND') {
    price = (inst as any).currentPrice;
    yieldVal = (inst as any).yieldToMaturity;
    extra1Label = 'Dur';
    extra1Val = fmt((inst as any).duration, 2);
    extra2Label = 'Cpn';
    extra2Val = fmt((inst as any).coupon, 2);
  } else if (inst.securityType === 'INTEREST_RATE_SWAP') {
    price = (inst as any).fixedRate;
    yieldVal = undefined;
    extra1Label = 'MTM';
    extra1Val = fmtSize((inst as any).currentMtm ?? 0);
    extra2Label = 'DV01';
    extra2Val = fmt((inst as any).fixedLegDv01, 0);
  } else if (inst.securityType === 'FUTURE') {
    price = (inst as any).currentPrice;
    yieldVal = undefined;
    extra1Label = 'OI';
    extra1Val = fmtSize((inst as any).openInterest ?? 0);
    extra2Label = 'Vol';
    extra2Val = fmtSize((inst as any).volume ?? 0);
  } else if (inst.securityType === 'OPTION') {
    price = (inst as any).currentPrice;
    yieldVal = undefined;
    extra1Label = 'IV';
    extra1Val = `${fmt((inst as any).impliedVol, 1)}%`;
    extra2Label = 'Δ';
    extra2Val = fmt((inst as any).delta, 3);
  }

  return (
    <tr>
      <td className="id-cell">{inst.instrumentId}</td>
      <td><span className={`type-badge type-${inst.securityType}`}>{typeLabel(inst.securityType)}</span></td>
      <td className="desc-cell">{inst.description}</td>
      <td className={`num-cell ${cellClass('bidPrice', flash)}`}>{fmt(inst.bidPrice)}</td>
      <td className={`num-cell ${cellClass('askPrice', flash)}`}>{fmt(inst.askPrice)}</td>
      <td className={`num-cell ${cellClass('bidYield', flash)}`}>{yieldVal !== undefined ? fmt(inst.bidYield, 3) : '—'}</td>
      <td className={`num-cell ${cellClass('askYield', flash)}`}>{yieldVal !== undefined ? fmt(inst.askYield, 3) : '—'}</td>
      <td className={`num-cell ${cellClass('currentPrice', flash)} ${cellClass('fixedRate', flash)}`}>{price !== undefined ? fmt(price) : '—'}</td>
      <td className={`num-cell ${pctClass}`}>{fmtPct(inst.percentageChange)}</td>
      <td className="num-cell">{fmtSize(inst.bidSize)}</td>
      <td className="num-cell">{fmtSize(inst.offerSize)}</td>
      <td className="num-cell extra-label">{extra1Label}</td>
      <td className={`num-cell ${cellClass(extra1Label === 'IV' ? 'impliedVol' : extra1Label === 'Δ' ? 'delta' : '', flash)}`}>{extra1Val}</td>
      <td className="num-cell extra-label">{extra2Label}</td>
      <td className="num-cell">{extra2Val}</td>
      <td className="num-cell">{inst.trader}</td>
    </tr>
  );
}
