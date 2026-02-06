/**
 * In-memory store for N26 OAuth tokens.
 * Optionally persists to .n26-tokens.json (gitignored) so tokens survive server restart.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_FILE = path.join(__dirname, '.n26-tokens.json');

let tokens = null;

function loadFromFile() {
  try {
    const raw = fs.readFileSync(TOKENS_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (data && typeof data.access_token === 'string') {
      tokens = data;
      return;
    }
  } catch (_) {
    // file missing or invalid
  }
  tokens = null;
}

function saveToFile() {
  if (!tokens) {
    try {
      if (fs.existsSync(TOKENS_FILE)) fs.unlinkSync(TOKENS_FILE);
    } catch (_) {}
    return;
  }
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 0), 'utf8');
  } catch (err) {
    console.warn('Could not persist N26 tokens to file:', err.message);
  }
}

export function getTokens() {
  if (tokens === null) loadFromFile();
  return tokens;
}

export function setTokens(data) {
  tokens = data;
  saveToFile();
}

export function clearTokens() {
  tokens = null;
  saveToFile();
}

export function isConnected() {
  return getTokens() != null;
}
