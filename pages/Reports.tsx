import React from 'react';
import { useDataSource } from '../context/DataSourceContext';

export const Reports = () => {
  const { isReal } = useDataSource();
  return (
    <div className="p-20 text-center glass-card rounded-3xl border-dashed border-2 border-border-dark">
      <span className="material-symbols-outlined text-6xl text-primary/20 mb-6">monitoring</span>
      <h2 className="text-4xl font-black italic uppercase">Market Analytics</h2>
      <p className="text-gray-500 mt-4 font-bold uppercase tracking-widest text-xs">Deep dive analysis engine coming soon…</p>
      <p className="text-[#9db9a6] text-[10px] font-black uppercase tracking-widest mt-6">Data source: {isReal ? 'Real' : 'Mock'}</p>
    </div>
  );
};
