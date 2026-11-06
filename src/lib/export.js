import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const TYPE_LABEL = { income: 'Ingreso', expense: 'Gasto', transfer: 'Transferencia' };

function cell(v) {
  const s = v == null ? '' : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const num = (cents) => (cents / 100).toFixed(2).replace('.', ',');

/**
 * Exporta movimientos a CSV separado por ";" con BOM,
 * así Excel en español lo abre directo con acentos y columnas bien separadas.
 */
export async function exportTransactionsCsv(txs, accounts, categories, fileName = 'mango-movimientos') {
  const acc = new Map(accounts.map((a) => [a.id, a.name]));
  const cat = new Map(categories.map((c) => [c.id, c.name]));

  const header = [
    'Fecha',
    'Tipo',
    'Monto',
    'Moneda',
    'Cuenta',
    'Cuenta destino',
    'Monto destino',
    'Categoría',
    'Nota',
    'Cotización',
  ];
  const rows = txs.map((t) => [
    t.date,
    TYPE_LABEL[t.type],
    num(t.amount),
    t.currency,
    acc.get(t.accountId) ?? '',
    t.toAccountId ? (acc.get(t.toAccountId) ?? '') : '',
    t.toAmount != null ? num(t.toAmount) : '',
    t.categoryId ? (cat.get(t.categoryId) ?? '') : '',
    t.note ?? '',
    t.rate ?? '',
  ]);

  const csv = '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');

  const file = new File(Paths.cache, `${fileName}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  if (!(await Sharing.isAvailableAsync()))
    throw new Error('Compartir no está disponible en este dispositivo');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Exportar movimientos',
    UTI: 'public.comma-separated-values-text',
  });
}
