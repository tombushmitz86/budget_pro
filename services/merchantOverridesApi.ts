/**
 * Merchant overrides API: list rules (fingerprint -> category) applied by the classifier.
 */

export interface MerchantOverride {
  fingerprint: string;
  category: string;
  example_merchant: string | null;
  updated_at: string;
}

// Use same base as transactions API (dev: proxy /api; prod: VITE_API_URL or localhost:3001)
const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '' : 'http://localhost:3001');

export async function getMerchantOverrides(): Promise<MerchantOverride[]> {
  // Use underscore path to avoid 404s with some proxies that mishandle hyphens
  const url = `${API_BASE}/api/merchant_overrides`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? res.statusText ?? String(res.status);
    throw new Error(msg);
  }
  const arr = Array.isArray(data) ? data : [];
  return arr.map((r: Record<string, unknown>) => ({
    fingerprint: String(r.fingerprint ?? ''),
    category: String(r.category ?? ''),
    example_merchant: r.example_merchant != null ? String(r.example_merchant) : null,
    updated_at: String(r.updated_at ?? r.updatedAt ?? ''),
  }));
}
