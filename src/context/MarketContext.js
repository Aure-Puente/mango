//MarketContext:
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { currentPeriod } from '@/lib/dates';
import { fetchMarket, inflationFactor, loadCachedMarket } from '@/lib/rates';
import { useData } from './DataContext';

const Ctx = createContext(null);

export function MarketProvider({ children }) {
  const { settings } = useData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      try {
        const cached = data ?? (await loadCachedMarket());
        if (cached && !data) setData(cached);
        const fresh = await fetchMarket(cached, force);
        setData(fresh);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sin conexión');
      } finally {
        setLoading(false);
      }
    },
    [data],
  );

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') load();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => {
    const quotes = data?.quotes ?? [];
    const quote =
      quotes.find((q) => q.casa === settings.rateType) ?? quotes.find((q) => q.casa === 'oficial') ?? null;
    const rate = quote?.venta ?? 0;
    const inflation = data?.inflation ?? {};
    const infPeriods = Object.keys(inflation).sort();
    const lastInflationPeriod = infPeriods[infPeriods.length - 1] ?? null;

    return {
      data,
      loading,
      error,
      rate,
      quote,
      quotes,
      rateFor: (p, type) => {
        if (p >= currentPeriod()) return rate;
        const hist = data?.history[type ?? settings.rateType];
        return hist?.[p] ?? rate;
      },
      realFactor: (p) => (lastInflationPeriod ? inflationFactor(inflation, p, lastInflationPeriod) : 1),
      lastInflationPeriod,
      refresh: () => load(true),
    };
  }, [data, loading, error, settings.rateType, load]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMarket() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMarket fuera de MarketProvider');
  return v;
}
