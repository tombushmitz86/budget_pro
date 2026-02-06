import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type DataSourceMode = 'mock' | 'real';

const STORAGE_KEY = 'budgetpro_data_source';

function getStoredMode(): DataSourceMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'mock' || raw === 'real') return raw;
  } catch (_) {}
  return 'mock';
}

interface DataSourceContextValue {
  mode: DataSourceMode;
  setMode: (mode: DataSourceMode) => void;
  isReal: boolean;
  isMock: boolean;
}

const DataSourceContext = createContext<DataSourceContextValue | null>(null);

export function DataSourceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DataSourceMode>(getStoredMode);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (_) {}
  }, [mode]);

  const setMode = useCallback((m: DataSourceMode) => {
    setModeState(m);
  }, []);

  const value: DataSourceContextValue = {
    mode,
    setMode,
    isReal: mode === 'real',
    isMock: mode === 'mock',
  };

  return (
    <DataSourceContext.Provider value={value}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource(): DataSourceContextValue {
  const ctx = useContext(DataSourceContext);
  if (!ctx) throw new Error('useDataSource must be used within DataSourceProvider');
  return ctx;
}
