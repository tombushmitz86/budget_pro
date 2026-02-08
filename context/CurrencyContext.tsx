import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Currency } from '../types';
import { getSettings, updateSettings } from '../services/settingsApi';

const STORAGE_KEY = 'budgetpro_currency';

/** Exchange rate: amount in USD × rate = amount in display currency */
const RATES_FROM_USD: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  ILS: 3.7,
};

const SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  ILS: '₪',
};

const VALID_CURRENCY = new Set<string>(['USD', 'EUR', 'ILS']);

function getStoredCurrency(): Currency {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && VALID_CURRENCY.has(raw)) return raw as Currency;
  } catch (_) {}
  return 'USD';
}

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Convert amount stored in USD to display value in selected currency */
  convertFromUSD: (amountUsd: number) => number;
  /** Format amount (stored in USD) in selected currency with symbol */
  formatMoney: (amountUsd: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(getStoredCurrency);

  // Load preferred currency from DB on mount when backend is available
  useEffect(() => {
    getSettings()
      .then((s) => {
        if (s.preferred_currency && VALID_CURRENCY.has(s.preferred_currency)) {
          setCurrencyState(s.preferred_currency as Currency);
          try {
            localStorage.setItem(STORAGE_KEY, s.preferred_currency);
          } catch (_) {}
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch (_) {}
  }, [currency]);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    updateSettings({ preferred_currency: c }).catch(() => {});
  }, []);

  const convertFromUSD = useCallback(
    (amountUsd: number) => amountUsd * RATES_FROM_USD[currency],
    [currency]
  );

  const formatMoney = useCallback(
    (amountUsd: number) => {
      const value = convertFromUSD(amountUsd);
      const abs = Math.abs(value);
      const formatted = abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const prefix = value < 0 ? '-' : '';
      return `${prefix}${SYMBOLS[currency]}${formatted}`;
    },
    [currency, convertFromUSD]
  );

  const value: CurrencyContextValue = {
    currency,
    setCurrency,
    convertFromUSD,
    formatMoney,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
