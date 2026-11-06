//rates:
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'mango.market.v1';
const TTL = 1000 * 60 * 30;

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res.json();
}

async function fetchQuotes() {
  return getJson('https://dolarapi.com/v1/dolares');
}

async function fetchHistory(casa) {
  const rows = await getJson(`https://api.argentinadatos.com/v1/cotizaciones/dolares/${casa}`);
  const map = {};
  for (const r of rows) {
    if (r?.fecha && r.venta) map[r.fecha.slice(0, 7)] = r.venta;
  }
  return map;
}

async function fetchInflation() {
  const rows = await getJson('https://api.argentinadatos.com/v1/finanzas/indices/inflacion');
  const map = {};
  for (const r of rows) if (r?.fecha) map[r.fecha.slice(0, 7)] = r.valor;
  return map;
}

export async function loadCachedMarket() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function fetchMarket(prev, force = false) {
  if (!force && prev && Date.now() - prev.fetchedAt < TTL) return prev;

  const [quotes, oficial, blue, bolsa, inflation] = await Promise.allSettled([
    fetchQuotes(),
    fetchHistory('oficial'),
    fetchHistory('blue'),
    fetchHistory('bolsa'),
    fetchInflation(),
  ]);

  const pick = (r, fallback) => (r.status === 'fulfilled' ? r.value : fallback);

  const data = {
    quotes: pick(quotes, prev?.quotes ?? []),
    history: {
      oficial: pick(oficial, prev?.history.oficial ?? {}),
      blue: pick(blue, prev?.history.blue ?? {}),
      bolsa: pick(bolsa, prev?.history.bolsa ?? {}),
    },
    inflation: pick(inflation, prev?.inflation ?? {}),
    fetchedAt: Date.now(),
  };
  if (data.quotes.length === 0 && !prev) throw new Error('No se pudo obtener la cotización del dólar');
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
  return data;
}

export const RATE_LABEL = {
  oficial: 'Oficial',
  blue: 'Blue',
  bolsa: 'MEP',
};

export function inflationFactor(inflation, from, to) {
  if (from >= to) return 1;
  let f = 1;
  let [y, m] = from.split('-').map(Number);
  while (true) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const p = `${y}-${String(m).padStart(2, '0')}`;
    if (p > to) break;
    const v = inflation[p];
    if (v != null) f *= 1 + v / 100;
  }
  return f;
}
