import { addMonths, dateInPeriod, monthsBetween, parsePeriod, periodOf, periodRange } from './dates';
import { splitEven } from './money';

/* ---------- Conversión ---------- */

/** Crea un conversor a la moneda de visualización */
export function makeConverter(display, currentRate) {
  return (cents, currency, rateHint) => {
    if (currency === display) return cents;
    const rate = rateHint || currentRate;
    if (!rate) return 0;
    return currency === 'USD' ? Math.round(cents * rate) : Math.round(cents / rate);
  };
}

/* ---------- Tarjetas y cuotas ---------- */

/**
 * Período en que se paga una compra con tarjeta.
 * Si la compra es después del cierre, entra en el resumen siguiente.
 * Si el vencimiento es "antes" que el cierre (ej: cierra 25, vence 5), se paga el mes siguiente.
 */
export function cardFirstPeriod(card, purchaseDate) {
  const day = Number(purchaseDate.slice(8, 10));
  let closePeriod = periodOf(purchaseDate);
  if (day > card.closingDay) closePeriod = addMonths(closePeriod, 1);
  return card.dueDay > card.closingDay ? closePeriod : addMonths(closePeriod, 1);
}

/** Cronograma de cuotas, con la cancelación anticipada agrupada */
export function installmentSchedule(p) {
  const amounts = splitEven(p.total, p.installments);
  const all = amounts.map((amount, i) => ({ numbers: [i + 1], period: addMonths(p.firstPeriod, i), amount }));
  if (!p.prepaidAt) return all;

  const before = all.filter((e) => e.period < p.prepaidAt || p.paid[String(e.numbers[0])]);
  const rest = all.filter((e) => !before.includes(e));
  if (rest.length === 0) return before;
  return [
    ...before,
    {
      numbers: rest.flatMap((e) => e.numbers),
      period: p.prepaidAt,
      amount: rest.reduce((s, e) => s + e.amount, 0),
      prepaid: true,
    },
  ];
}

export function purchaseProgress(p) {
  const paidCount = Object.keys(p.paid ?? {}).length;
  const schedule = installmentSchedule(p);
  const remaining = schedule
    .filter((e) => !e.numbers.every((n) => p.paid?.[String(n)]))
    .reduce((s, e) => s + e.amount, 0);
  const lastPeriod = schedule[schedule.length - 1]?.period ?? p.firstPeriod;
  return { paidCount, total: p.installments, remaining, lastPeriod, done: paidCount >= p.installments };
}

/* ---------- Recurrentes ---------- */

export function recurringApplies(r, period) {
  if (period < r.startPeriod) return false;
  if (r.endPeriod && period > r.endPeriod) return false;
  if (r.months && r.months.length > 0) {
    return r.months.includes(parsePeriod(period).month);
  }
  return true;
}

/** Cuántas veces se repite un fijo con fin (ej: "cuota 3 de 6") */
export function recurringIndex(r, period) {
  if (!r.endPeriod) return null;
  return { n: monthsBetween(r.startPeriod, period) + 1, of: monthsBetween(r.startPeriod, r.endPeriod) + 1 };
}

/* ---------- Compromisos del mes ---------- */

export function commitmentsFor(period, recurring, purchases, cards) {
  const out = [];

  for (const r of recurring) {
    if (!recurringApplies(r, period)) continue;
    const idx = recurringIndex(r, period);
    const txId = r.paid?.[period];
    out.push({
      key: `r-${r.id}-${period}`,
      kind: 'recurring',
      type: r.type,
      refId: r.id,
      label: r.name,
      detail: idx ? `${idx.n} de ${idx.of}` : undefined,
      amount: r.amount,
      currency: r.currency,
      categoryId: r.categoryId,
      accountId: r.accountId,
      dueDate: dateInPeriod(period, r.dayOfMonth),
      paid: !!txId,
      txId,
    });
  }

  const cardById = new Map(cards.map((c) => [c.id, c]));
  for (const p of purchases) {
    for (const e of installmentSchedule(p)) {
      if (e.period !== period) continue;
      const card = p.cardId ? cardById.get(p.cardId) : undefined;
      const paid = e.numbers.every((n) => p.paid?.[String(n)]);
      out.push({
        key: `i-${p.id}-${e.numbers.join('_')}`,
        kind: 'installment',
        type: 'expense',
        refId: p.id,
        label: p.description,
        detail: e.prepaid
          ? `Cancelación anticipada (${e.numbers.length} cuotas)`
          : `Cuota ${e.numbers[0]} de ${p.installments}`,
        amount: e.amount,
        currency: p.currency,
        categoryId: p.categoryId,
        accountId: card?.accountId ?? p.accountId,
        cardId: p.cardId,
        numbers: e.numbers,
        dueDate: dateInPeriod(period, card?.dueDay ?? 10),
        paid,
        txId: paid ? p.paid[String(e.numbers[0])] : undefined,
      });
    }
  }

  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/* ---------- Saldos ---------- */

export function accountBalances(accounts, txs, until) {
  const bal = {};
  for (const a of accounts) bal[a.id] = a.initialBalance ?? 0;
  for (const t of txs) {
    if (until && t.date > until) continue;
    if (t.type === 'income') bal[t.accountId] = (bal[t.accountId] ?? 0) + t.amount;
    else if (t.type === 'expense') bal[t.accountId] = (bal[t.accountId] ?? 0) - t.amount;
    else if (t.type === 'transfer') {
      bal[t.accountId] = (bal[t.accountId] ?? 0) - t.amount;
      if (t.toAccountId) bal[t.toAccountId] = (bal[t.toAccountId] ?? 0) + (t.toAmount ?? t.amount);
    }
  }
  return bal;
}

/* ---------- Resumen mensual ---------- */

export function txInPeriod(txs, period) {
  return txs.filter((t) => t.date.startsWith(period));
}

export function monthSummary(period, txs, commitments, conv) {
  let income = 0;
  let expense = 0;
  for (const t of txInPeriod(txs, period)) {
    if (t.type === 'income') income += conv(t.amount, t.currency, t.rate);
    else if (t.type === 'expense') expense += conv(t.amount, t.currency, t.rate);
  }
  let pendingIncome = 0;
  let pendingExpense = 0;
  for (const c of commitments) {
    if (c.paid) continue;
    if (c.type === 'income') pendingIncome += conv(c.amount, c.currency);
    else pendingExpense += conv(c.amount, c.currency);
  }
  const totalIn = income + pendingIncome;
  const totalOut = expense + pendingExpense;
  return {
    period,
    income,
    expense,
    pendingIncome,
    pendingExpense,
    projected: totalIn - totalOut,
    net: income - expense,
    savingsRate: totalIn > 0 ? (totalIn - totalOut) / totalIn : null,
  };
}

export function spendingByCategory(period, txs, categories, conv, displayCurrency, currentRate) {
  const map = new Map();
  for (const t of txInPeriod(txs, period)) {
    if (t.type !== 'expense') continue;
    const k = t.categoryId ?? '_none';
    map.set(k, (map.get(k) ?? 0) + conv(t.amount, t.currency, t.rate));
  }
  const byId = new Map(categories.map((c) => [c.id, c]));
  const rows = [];
  for (const c of categories) {
    if (c.kind !== 'expense') continue;
    const amount = map.get(c.id) ?? 0;
    // El presupuesto se guarda en pesos
    const budget = c.budget
      ? displayCurrency === 'ARS'
        ? c.budget
        : Math.round(c.budget / (currentRate || 1))
      : null;
    if (amount === 0 && !budget) continue;
    rows.push({ category: c, amount, budget, ratio: budget ? amount / budget : null });
  }
  const none = map.get('_none');
  if (none) rows.push({ category: null, amount: none, budget: null, ratio: null });
  for (const [k, v] of map) {
    if (k !== '_none' && !byId.has(k)) rows.push({ category: null, amount: v, budget: null, ratio: null });
  }
  return rows.sort((a, b) => b.amount - a.amount);
}

/* ---------- Proyección ---------- */

/** Lo que ya está comprometido en los próximos meses (fijos + cuotas) */
export function projection(from, months, recurring, purchases, cards, conv) {
  return periodRange(from, addMonths(from, months - 1)).map((period) => {
    const cs = commitmentsFor(period, recurring, purchases, cards);
    let installments = 0;
    let fixed = 0;
    let committedIncome = 0;
    for (const c of cs) {
      const v = conv(c.amount, c.currency);
      if (c.type === 'income') committedIncome += v;
      else if (c.kind === 'installment') installments += v;
      else fixed += v;
    }
    return { period, installments, fixed, committedExpense: installments + fixed, committedIncome };
  });
}

/* ---------- Patrimonio ---------- */

export function netWorthSeries(periods, accounts, txs, rateFor) {
  return periods.map((p) => {
    const end = dateInPeriod(p, 31);
    const bal = accountBalances(accounts, txs, end);
    const rate = rateFor(p);
    let ars = 0;
    for (const a of accounts) {
      const v = bal[a.id] ?? 0;
      ars += a.currency === 'USD' ? Math.round(v * rate) : v;
    }
    return { period: p, ars, usd: rate ? Math.round(ars / rate) : 0 };
  });
}

/* ---------- Gasto excesivo ---------- */

/** Compara el gasto del mes (real + comprometido) contra el promedio de los 3 meses anteriores */
export function spendingInsight(current, previous) {
  const prev = previous.filter((v) => v > 0);
  if (prev.length === 0) return null;
  const average = Math.round(prev.reduce((s, v) => s + v, 0) / prev.length);
  const ratio = average > 0 ? current / average : 1;
  return { level: ratio > 1.25 ? 'high' : ratio > 1.1 ? 'warn' : 'ok', ratio, average };
}

/* ---------- Deudas y préstamos ---------- */

/** Cuánto se devolvió, cuánto falta y si ya está saldada */
export function debtStatus(d) {
  const paid = (d.payments ?? []).reduce((s, p) => s + p.amount, 0);
  const pending = Math.max(0, d.amount - paid);
  return { paid, pending, done: pending === 0, ratio: d.amount ? Math.min(1, paid / d.amount) : 0 };
}

/** Totales pendientes por dirección, convertidos con `conv` */
export function debtTotals(debts, conv) {
  const t = { owed: 0, owe: 0, owedCount: 0, oweCount: 0 };
  for (const d of debts) {
    const { pending } = debtStatus(d);
    if (!pending) continue;
    t[d.direction] += conv(pending, d.currency);
    t[`${d.direction}Count`] += 1;
  }
  return t;
}
