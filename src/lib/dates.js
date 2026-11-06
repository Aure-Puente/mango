//dates:
const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
export const MONTHS_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const pad = (n) => String(n).padStart(2, '0');

export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromDateStr = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
export const today = () => toDateStr(new Date());
export const periodOf = (d) => d.slice(0, 7);
export const currentPeriod = () => periodOf(today());

export function parsePeriod(p) {
  const [y, m] = p.split('-').map(Number);
  return { year: y, month: m };
}

export function addMonths(p, n) {
  const { year, month } = parsePeriod(p);
  const idx = year * 12 + (month - 1) + n;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

export function monthsBetween(a, b) {
  const A = parsePeriod(a);
  const B = parsePeriod(b);
  return (B.year - A.year) * 12 + (B.month - A.month);
}

export function daysInMonth(p) {
  const { year, month } = parsePeriod(p);
  return new Date(year, month, 0).getDate();
}

export function dateInPeriod(p, day) {
  return `${p}-${pad(Math.min(Math.max(1, day), daysInMonth(p)))}`;
}

export function periodLabel(p, withYear = true) {
  const { year, month } = parsePeriod(p);
  return withYear ? `${MONTHS[month - 1]} ${year}` : MONTHS[month - 1];
}

export function periodShort(p) {
  const { year, month } = parsePeriod(p);
  return `${MONTHS_SHORT[month - 1]} ${String(year).slice(2)}`;
}

export function dateLabel(d) {
  const t = today();
  if (d === t) return 'Hoy';
  const y = toDateStr(new Date(Date.now() - 86400000));
  if (d === y) return 'Ayer';
  const [yy, mm, dd] = d.split('-').map(Number);
  const sameYear = yy === new Date().getFullYear();
  return `${dd} ${MONTHS_SHORT[mm - 1].toLowerCase()}${sameYear ? '' : ` ${yy}`}`;
}

export function periodRange(from, to) {
  const n = monthsBetween(from, to);
  return Array.from({ length: Math.max(0, n + 1) }, (_, i) => addMonths(from, i));
}

export function daysUntil(d) {
  return Math.round((fromDateStr(d).getTime() - fromDateStr(today()).getTime()) / 86400000);
}
