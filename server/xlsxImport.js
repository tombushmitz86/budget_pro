/**
 * XLSX import: parse Excel (.xlsx / .xls) into transaction-like rows.
 * - Generic: first sheet, first row = headers, same column mapping as CSV (rowToTransaction).
 * - BCC: credit card statement schema (ListaMovimenti) with Italian columns.
 * Idempotent: same stable id per row.
 */

import * as XLSX from 'xlsx';
import { rowToTransaction, stableIdForRow } from './csvImport.js';

/**
 * Parse XLSX buffer (generic N26-style columns) and return an array of transaction-like objects with stable ids.
 */
function parseXlsxToTransactions(buffer) {
  if (!buffer || (!(buffer instanceof Buffer) && !(buffer instanceof Uint8Array))) {
    return [];
  }
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows
    .map((row) => rowToTransaction(row))
    .filter((tx) => tx.merchant || tx.amount !== 0);
}

/**
 * BCC credit card statement schema (ListaMovimenti):
 * NR CARTA, TITOLARE, DATA REGISTR., DATA ACQUISTO, DESCRIZIONE DELLE OPERAZIONI, IMPORTO IN EURO, IMPORTO IN VALUTA ORIGINALE, VALUTA ORIGINALE, COMMISSIONI
 * Dates: dd/mm/yyyy or dd/mm/yyyy hh:mm:ss. Amounts: Italian format -250,00
 */
function parseBccXlsxToTransactions(buffer) {
  if (!buffer || (!(buffer instanceof Buffer) && !(buffer instanceof Uint8Array))) {
    return [];
  }
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, header: 1 });
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const headerRow = rows[0];
  const headers = Array.isArray(headerRow) ? headerRow.map((h) => String(h || '').trim()) : [];
  const dataRows = rows.slice(1);
  const result = [];
  for (const row of dataRows) {
    const byHeader = {};
    headers.forEach((h, i) => {
      byHeader[h] = row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : '';
    });
    const { dateStr, timeStr } = parseBccDateTime(byHeader['DATA ACQUISTO'] || byHeader['DATA REGISTR.']);
    const amountStr = byHeader['IMPORTO IN EURO'] || '';
    const amount = parseBccAmount(amountStr);
    const merchant = (byHeader['DESCRIZIONE DELLE OPERAZIONI'] || '').trim() || 'Unknown';
    if (!dateStr) continue;
    const tx = {
      id: stableIdForRow(dateStr, amount, merchant, timeStr),
      merchant,
      date: dateStr,
      amount,
      type: 'one-time',
      paymentMethod: 'BCC',
      status: 'completed',
      icon: 'receipt_long',
    };
    result.push(tx);
  }
  return result.filter((tx) => tx.merchant || tx.amount !== 0);
}

/** Returns { dateStr: 'YYYY-MM-DD', timeStr: 'HH:mm:ss' or '' } for stable id (full timestamp). */
function parseBccDateTime(val) {
  let dateStr = '';
  let timeStr = '';
  if (!val) return { dateStr: '', timeStr: '' };
  const s = String(val).trim();
  const parts = s.split(/\s+/);
  const datePart = parts[0] || '';
  const timePart = parts.slice(1).join(' ').trim();
  const m = datePart.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{2,4})$/);
  if (m) {
    const [, d, mth, y] = m;
    const year = y.length === 2 ? `20${y}` : y;
    dateStr = `${year}-${mth.padStart(2, '0')}-${d.padStart(2, '0')}`;
  } else {
    try {
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) {
        dateStr = d.toISOString().slice(0, 10);
        timeStr = d.toISOString().slice(11, 19);
      }
    } catch (_) {}
  }
  if (dateStr && timePart && /^\d{1,2}:\d{2}/.test(timePart)) {
    const t = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (t) {
      const [, h, min, sec] = t;
      timeStr = `${h.padStart(2, '0')}:${min.padStart(2, '0')}:${(sec || '00').padStart(2, '0')}`;
    }
  }
  return { dateStr, timeStr };
}

function parseBccAmount(val) {
  if (val === '' || val == null) return 0;
  const s = String(val).replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

export { parseXlsxToTransactions, parseBccXlsxToTransactions };
