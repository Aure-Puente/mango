import { useCallback, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { useMarket } from '@/context/MarketContext';
import { commitmentsFor, makeConverter, monthSummary } from '@/lib/finance';
import { formatMoney } from '@/lib/money';

/** Atajos comunes: moneda de visualización, conversor y formato */
export function useFinance() {
  const data = useData();
  const market = useMarket();
  const display = data.settings.displayCurrency;

  const conv = useMemo(() => makeConverter(display, market.rate), [display, market.rate]);

  const fmt = useCallback((cents, currency = display, opts) => formatMoney(cents, currency, opts), [display]);

  const commitments = useCallback(
    (p) => commitmentsFor(p, data.recurring, data.purchases, data.cards),
    [data.recurring, data.purchases, data.cards],
  );

  const summary = useCallback(
    (p) => monthSummary(p, data.transactions, commitments(p), conv),
    [data.transactions, commitments, conv],
  );

  return { ...data, market, display, conv, fmt, commitments, summary };
}
