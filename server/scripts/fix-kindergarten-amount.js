#!/usr/bin/env node
/**
 * Set the Kindengarden recurring transaction amount to €340 (monthly).
 *
 * Usage (from budget_pro, with server running):
 *   node server/scripts/fix-kindergarten-amount.js
 *
 * Start the API first: npm run server
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function main() {
  const res = await fetch(`${API_URL}/api/transactions`);
  if (!res.ok) {
    console.error('Failed to fetch transactions. Is the server running? (npm run server)');
    process.exit(1);
  }
  const list = await res.json();
  const match = list.find(
    (t) => t.type === 'recurring' && /kindengarden/i.test((t.merchant || '').trim())
  );
  if (!match) {
    console.error('No recurring transaction with merchant "Kindengarden" found.');
    process.exit(1);
  }

  const putRes = await fetch(`${API_URL}/api/transactions/${encodeURIComponent(match.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...match, amount: -340 }),
  });
  if (!putRes.ok) {
    console.error('Failed to update transaction:', putRes.status, await putRes.text());
    process.exit(1);
  }
  console.log(`Updated "${match.merchant}" (id: ${match.id}) amount to €340/month.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
