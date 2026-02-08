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
  /** Convert amount from one currency to display currency (amount is in amountCurrency) */
  convertToDisplay: (amount: number, amountCurrency: Currency) => number;
  /** Format amount in display currency. Amount is in amountCurrency (default EUR). Use decimals 0 for whole numbers (round display). */
  formatMoney: (amount: number, amountCurrency?: Currency, decimals?: number) => string;
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

  /** Amount is in amountCurrency; returns value in display currency. Uses USD as pivot: amount/rateFromUsd[amountCurrency]*rateFromUsd[display]. */
  const convertToDisplay = useCallback(
    (amount: number, amountCurrency: Currency) => {
      const inUsd = amount / RATES_FROM_USD[amountCurrency];
      return inUsd * RATES_FROM_USD[currency];
    },
    [currency]
  );

  /** Format amount. Amount is in amountCurrency (default EUR). Converts to display currency and formats. Use decimals 0 for round (whole) display. */
  const formatMoney = useCallback(
    (amount: number, amountCurrency: Currency = 'EUR', decimals: number = 2) => {
      const value = convertToDisplay(amount, amountCurrency);
      const abs = Math.abs(value);
      const rounded = decimals === 0 ? Math.round(abs) : abs;
      const formatted = decimals === 0
        ? rounded.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const prefix = value < 0 ? '-' : '';
      return `${prefix}${SYMBOLS[currency]}${formatted}`;
    },
    [currency, convertToDisplay]
  );

  const value: CurrencyContextValue = {
    currency,
    setCurrency,
    convertToDisplay,
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
