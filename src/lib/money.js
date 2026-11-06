/**
 * Convierte texto ingresado por el usuario a centavos.
 * Acepta "1.234,56", "1234,56", "1234.56", "1.500" (= 1500).
 */
export function parseAmount(input) {
  let s = input.replace(/[^\d.,-]/g, '').trim();
  if (!s) return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    const dots = s.split('.').length - 1;
    if (dots > 1) s = s.replace(/\./g, '');
    else if (dots === 1 && /\.\d{3}$/.test(s)) s = s.replace('.', '');
  }
  const n = Number(s);
  if (!isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Centavos -> texto editable ("1234,5") */
export function centsToInput(cents) {
  if (cents == null) return '';
  const v = cents / 100;
  return (Number.isInteger(v) ? String(v) : v.toFixed(2)).replace('.', ',');
}

function group(int) {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export const currencySymbol = (c) => (c === 'USD' ? 'US$' : '$');

export function formatMoney(cents, currency = 'ARS', opts = {}) {
  const neg = cents < 0;
  const abs = Math.abs(cents) / 100;
  let body;
  if (opts.compact && abs >= 1_000_000) {
    body = (abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace('.', ',') + 'M';
  } else if (opts.compact && abs >= 10_000) {
    body = Math.round(abs / 1000) + 'k';
  } else {
    const showDec = opts.decimals || (currency === 'USD' && abs % 1 !== 0) || (abs < 100 && abs % 1 !== 0);
    const [int, dec] = abs.toFixed(showDec ? 2 : 0).split('.');
    body = group(int) + (dec ? ',' + dec : '');
  }
  const prefix = neg ? '−' : opts.sign && cents > 0 ? '+' : '';
  return opts.bare ? `${prefix}${body}` : `${prefix}${currencySymbol(currency)} ${body}`;
}

/** Convierte entre monedas usando pesos por dólar */
export function convert(cents, from, to, rate) {
  if (from === to || !rate) return cents;
  return from === 'USD' ? Math.round(cents * rate) : Math.round(cents / rate);
}

/** Divide un total en N partes enteras; el resto va a la última */
export function splitEven(total, parts) {
  const base = Math.floor(total / parts);
  const arr = Array.from({ length: parts }, () => base);
  arr[parts - 1] += total - base * parts;
  return arr;
}

export const percent = (v, digits = 0) => `${(v * 100).toFixed(digits).replace('.', ',')}%`;
