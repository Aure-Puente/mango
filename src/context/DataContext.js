//DataContext:
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/lib/firebase';
import { today } from '@/lib/dates';
import { DEFAULT_SETTINGS } from '@/types';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);

const CATEGORIES_VERSION = 2;

const DEFAULT_CATEGORIES = [
  { name: 'Supermercado', kind: 'expense', icon: 'cart-outline', color: '#FF9F1C' },
  { name: 'Comida', kind: 'expense', icon: 'silverware-fork-knife', color: '#FB923C' },
  { name: 'Salidas', kind: 'expense', icon: 'glass-cocktail', color: '#F472B6' },
  { name: 'Gimnasio', kind: 'expense', icon: 'dumbbell', color: '#4ADE80' },
  { name: 'Transporte', kind: 'expense', icon: 'bus', color: '#60A5FA' },
  { name: 'Vivienda', kind: 'expense', icon: 'home-outline', color: '#C792EA' },
  { name: 'Servicios', kind: 'expense', icon: 'flash-outline', color: '#FFD166' },
  { name: 'Suscripciones', kind: 'expense', icon: 'play-box-multiple-outline', color: '#8EA8FF' },
  { name: 'Salud', kind: 'expense', icon: 'heart-pulse', color: '#FF5A5F' },
  { name: 'Ropa', kind: 'expense', icon: 'tshirt-crew-outline', color: '#14B8A6' },
  { name: 'Educación', kind: 'expense', icon: 'school-outline', color: '#60A5FA' },
  { name: 'Ocio', kind: 'expense', icon: 'gamepad-variant-outline', color: '#C792EA' },
  { name: 'Regalos', kind: 'expense', icon: 'gift-outline', color: '#FF5A5F' },
  { name: 'Otros gastos', kind: 'expense', icon: 'dots-horizontal', color: '#A3A3A3' },
  { name: 'Sueldo', kind: 'income', icon: 'briefcase-outline', color: '#2EC4B6' },
  { name: 'Extras', kind: 'income', icon: 'cash-plus', color: '#4ADE80' },
  { name: 'Aguinaldo', kind: 'income', icon: 'star-circle-outline', color: '#FFD166' },
  { name: 'Rendimientos', kind: 'income', icon: 'chart-line', color: '#8EA8FF' },
  { name: 'Otros ingresos', kind: 'income', icon: 'cash', color: '#A3A3A3' },
];

const DEFAULT_ACCOUNTS = [
  { name: 'Efectivo', type: 'cash', currency: 'ARS', initialBalance: 0, color: '#4ADE80', createdAt: 1 },
  {
    name: 'Mercado Pago',
    type: 'mp',
    currency: 'ARS',
    initialBalance: 0,
    remunerated: true,
    color: '#60A5FA',
    createdAt: 2,
  },
  { name: 'Dólares', type: 'cash', currency: 'USD', initialBalance: 0, color: '#2EC4B6', createdAt: 3 },
];

export function DataProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.uid;

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [goals, setGoals] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loaded, setLoaded] = useState(new Set());
  const seeding = useRef(false);

  useEffect(() => {
    if (!uid) {
      setLoaded(new Set());
      return;
    }
    const mark = (k) => setLoaded((s) => (s.has(k) ? s : new Set(s).add(k)));
    const listen = (name, setter, sort) =>
      onSnapshot(collection(db, 'users', uid, name), (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setter(sort ? rows.sort(sort) : rows);
        mark(name);
      });

    const unsubs = [
      listen('accounts', setAccounts, (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
      listen('categories', setCategories, (a, b) => a.name.localeCompare(b.name)),
      listen('transactions', setTransactions, (a, b) =>
        b.date === a.date ? (b.createdAt ?? 0) - (a.createdAt ?? 0) : b.date.localeCompare(a.date),
      ),
      listen('cards', setCards, (a, b) => a.name.localeCompare(b.name)),
      listen('purchases', setPurchases, (a, b) => b.date.localeCompare(a.date)),
      listen('recurring', setRecurring, (a, b) => a.dayOfMonth - b.dayOfMonth),
      listen('goals', setGoals, (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
      listen(
        'debts',
        setDebts,
        (a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0),
      ),
      onSnapshot(doc(db, 'users', uid), (snap) => {
        setSettings({ ...DEFAULT_SETTINGS, ...(snap.data()?.settings ?? {}) });
        mark('settings');
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [uid]);

  useEffect(() => {
    if (!uid || seeding.current) return;
    seeding.current = true;
    (async () => {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      const current = snap.data()?.settings;

      if (!current?.seeded) {
        const batch = writeBatch(db);
        for (const c of DEFAULT_CATEGORIES) batch.set(doc(collection(db, 'users', uid, 'categories')), c);
        for (const a of DEFAULT_ACCOUNTS) batch.set(doc(collection(db, 'users', uid, 'accounts')), a);
        batch.set(
          userRef,
          { settings: { ...DEFAULT_SETTINGS, seeded: true, catVersion: CATEGORIES_VERSION } },
          { merge: true },
        );
        await batch.commit();
        return;
      }

      if ((current.catVersion ?? 1) < 2) {
        const catsRef = collection(db, 'users', uid, 'categories');
        const existing = (await getDocs(catsRef)).docs.map((d) => ({
          id: d.id,
          name: String(d.data().name ?? ''),
        }));
        const has = (n) => existing.some((c) => c.name.trim().toLowerCase() === n.toLowerCase());
        const batch = writeBatch(db);
        const combined = existing.find((c) => c.name.trim().toLowerCase() === 'comida y salidas');
        if (combined && !has('Comida')) {
          batch.update(doc(catsRef, combined.id), {
            name: 'Comida',
            icon: 'silverware-fork-knife',
            color: '#FB923C',
          });
        }
        for (const name of ['Comida', 'Salidas', 'Gimnasio']) {
          if (has(name) || (name === 'Comida' && combined)) continue;
          const def = DEFAULT_CATEGORIES.find((c) => c.name === name);
          batch.set(doc(catsRef), def);
        }
        batch.set(userRef, { settings: { catVersion: 2 } }, { merge: true });
        await batch.commit();
      }
    })().catch((e) => {
      console.warn('No se pudieron crear los datos iniciales', e);
      seeding.current = false;
    });
  }, [uid]);

  const value = useMemo(() => {
    const colRef = (name) => collection(db, 'users', uid, name);
    const docRef = (name, id) => doc(db, 'users', uid, name, id);

    const save = async (col, data) => {
      const { id, ...rest } = data;
      if (id) {
        await setDoc(docRef(col, id), rest, { merge: true });
        return id;
      }
      const ref = doc(colRef(col));
      await setDoc(ref, { createdAt: Date.now(), ...rest });
      return ref.id;
    };

    const remove = (col, id) => deleteDoc(docRef(col, id));

    const payCommitments = async (cs, opts) => {
      const batch = writeBatch(db);
      const date = opts.date ?? today();
      const created = [];
      for (const c of cs) {
        if (c.paid) continue;
        const txRef = doc(colRef('transactions'));
        const tx = {
          type: c.type,
          amount: c.amount,
          currency: c.currency,
          accountId: opts.accountId,
          categoryId: c.categoryId ?? null,
          note: c.detail ? `${c.label} · ${c.detail}` : c.label,
          date,
          rate: opts.rate ?? null,
          method: c.cardId ? 'credit' : null,
          source:
            c.kind === 'recurring'
              ? { kind: 'recurring', id: c.refId, period: c.dueDate.slice(0, 7) }
              : { kind: 'installment', purchaseId: c.refId, numbers: c.numbers ?? [] },
          createdAt: Date.now(),
        };
        if (c.kind === 'recurring') {
          const rec = recurring.find((r) => r.id === c.refId);
          if (rec?.incomeKind) tx.incomeKind = rec.incomeKind;
        }
        batch.set(txRef, tx);
        created.push({ c, txId: txRef.id });
        if (c.kind === 'recurring') {
          batch.update(docRef('recurring', c.refId), { [`paid.${c.dueDate.slice(0, 7)}`]: txRef.id });
        } else {
          const upd = {};
          for (const n of c.numbers ?? []) upd[`paid.${n}`] = txRef.id;
          batch.update(docRef('purchases', c.refId), upd);
        }
      }
      await batch.commit();
      return created;
    };

    const revertPayments = async (created) => {
      const batch = writeBatch(db);
      for (const { c, txId } of created) {
        batch.delete(docRef('transactions', txId));
        if (c.kind === 'recurring') {
          batch.update(docRef('recurring', c.refId), { [`paid.${c.dueDate.slice(0, 7)}`]: deleteField() });
        } else {
          const upd = {};
          for (const n of c.numbers ?? []) upd[`paid.${n}`] = deleteField();
          batch.update(docRef('purchases', c.refId), upd);
        }
      }
      await batch.commit();
    };

    const unlinkSource = (batch, tx) => {
      const s = tx.source;
      if (!s) return;
      if (s.kind === 'recurring') {
        if (recurring.some((r) => r.id === s.id)) {
          batch.update(docRef('recurring', s.id), { [`paid.${s.period}`]: deleteField() });
        }
      } else if (s.kind === 'installment') {
        if (purchases.some((p) => p.id === s.purchaseId)) {
          const upd = {};
          for (const n of s.numbers) upd[`paid.${n}`] = deleteField();
          batch.update(docRef('purchases', s.purchaseId), upd);
        }
      } else if (s.kind === 'debt') {
        const d = debts.find((x) => x.id === s.id);
        if (!d) return;
        if (s.paymentId) {
          const pay = (d.payments ?? []).find((x) => x.id === s.paymentId);
          if (pay) batch.update(docRef('debts', d.id), { payments: arrayRemove(pay) });
        } else {
          batch.update(docRef('debts', d.id), { txId: null, accountId: null });
        }
      }
    };

    const debtTx = (d, { amount, date, accountId, paymentId }) => {
      const initial = !paymentId;
      const out = (d.direction === 'owed') === initial;
      const note = initial
        ? d.direction === 'owed'
          ? `Préstamo a ${d.person}`
          : `Préstamo de ${d.person}`
        : d.direction === 'owed'
          ? `Cobro de ${d.person}`
          : `Pago a ${d.person}`;
      return {
        type: 'transfer',
        amount,
        currency: d.currency,
        accountId: out ? accountId : null,
        toAccountId: out ? null : accountId,
        toAmount: out ? null : amount,
        categoryId: null,
        note,
        date,
        rate: null,
        method: null,
        source: { kind: 'debt', id: d.id, ...(paymentId ? { paymentId } : {}) },
        createdAt: Date.now(),
      };
    };

    return {
      ready: !!uid && ['accounts', 'categories', 'transactions', 'settings'].every((k) => loaded.has(k)),
      isLoaded: (...keys) => !!uid && keys.every((k) => loaded.has(k)),
      settings,
      accounts,
      categories,
      transactions,
      cards,
      purchases,
      recurring,
      goals,
      debts,
      save,
      remove,

      createDebt: async (data) => {
        const batch = writeBatch(db);
        const ref = doc(colRef('debts'));
        const d = { ...data, id: ref.id };
        let txId = null;
        if (data.accountId) {
          const txRef = doc(colRef('transactions'));
          batch.set(txRef, debtTx(d, { amount: data.amount, date: data.date, accountId: data.accountId }));
          txId = txRef.id;
        }
        batch.set(ref, { ...data, txId, payments: [], createdAt: Date.now() });
        await batch.commit();
        return ref.id;
      },

      editDebt: async (d, data) => {
        const batch = writeBatch(db);
        const next = { ...d, ...data };
        if (d.txId) batch.delete(docRef('transactions', d.txId));
        let txId = null;
        if (next.accountId) {
          const txRef = doc(colRef('transactions'));
          batch.set(txRef, debtTx(next, { amount: next.amount, date: next.date, accountId: next.accountId }));
          txId = txRef.id;
        }
        batch.update(docRef('debts', d.id), { ...data, txId });
        await batch.commit();
      },

      addDebtPayment: async (d, { amount, date, accountId }) => {
        const batch = writeBatch(db);
        const paymentId = doc(colRef('debts')).id;
        let txId = null;
        if (accountId) {
          const txRef = doc(colRef('transactions'));
          batch.set(txRef, debtTx(d, { amount, date, accountId, paymentId }));
          txId = txRef.id;
        }
        const payment = { id: paymentId, amount, date, accountId: accountId ?? null, txId };
        batch.update(docRef('debts', d.id), { payments: arrayUnion(payment) });
        await batch.commit();
        return payment;
      },

      removeDebtPayment: async (d, payment) => {
        const batch = writeBatch(db);
        if (payment.txId) batch.delete(docRef('transactions', payment.txId));
        batch.update(docRef('debts', d.id), { payments: arrayRemove(payment) });
        await batch.commit();
      },

      deleteDebt: async (d) => {
        const batch = writeBatch(db);
        if (d.txId) batch.delete(docRef('transactions', d.txId));
        for (const pay of d.payments ?? []) if (pay.txId) batch.delete(docRef('transactions', pay.txId));
        batch.delete(docRef('debts', d.id));
        await batch.commit();
      },
      updateSettings: (s) => setDoc(doc(db, 'users', uid), { settings: s }, { merge: true }),

      deleteTransaction: async (tx) => {
        const batch = writeBatch(db);
        batch.delete(docRef('transactions', tx.id));
        unlinkSource(batch, tx);
        await batch.commit();
      },

      payCommitment: (c, opts) => payCommitments([c], opts),
      payCommitments,
      revertPayments,

      unpayCommitment: async (c) => {
        const tx = transactions.find((t) => t.id === c.txId);
        const batch = writeBatch(db);
        if (tx) {
          batch.delete(docRef('transactions', tx.id));
          unlinkSource(batch, tx);
        } else if (c.kind === 'recurring') {
          batch.update(docRef('recurring', c.refId), { [`paid.${c.dueDate.slice(0, 7)}`]: deleteField() });
        } else {
          const upd = {};
          for (const n of c.numbers ?? []) upd[`paid.${n}`] = deleteField();
          batch.update(docRef('purchases', c.refId), upd);
        }
        await batch.commit();
      },

      prepayPurchase: (p, period) => updateDoc(docRef('purchases', p.id), { prepaidAt: period }),
      undoPrepay: (p) => updateDoc(docRef('purchases', p.id), { prepaidAt: null }),

      contributeGoal: (g, amount) =>
        updateDoc(docRef('goals', g.id), { saved: Math.max(0, (g.saved ?? 0) + amount) }),
    };
  }, [uid, loaded, settings, accounts, categories, transactions, cards, purchases, recurring, goals, debts]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData fuera de DataProvider');
  return v;
}