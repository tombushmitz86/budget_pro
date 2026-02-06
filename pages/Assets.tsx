
import React, { useState, useEffect } from 'react';
import { ASSETS } from '../constants';
import { intelligence } from '../services/intelligenceService';
import { useCurrency } from '../context/CurrencyContext';

export const Assets = () => {
  const { formatMoney } = useCurrency();
  const [horizon, setHorizon] = useState(25);
  const [interest, setInterest] = useState(8.5);
  const [monthly, setMonthly] = useState(2500);
  const [projectedValue, setProjectedValue] = useState("4,124,980");
  const [isCalculating, setIsCalculating] = useState(false);

  const totalAssets = ASSETS.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = 420000;
  const netWorth = totalAssets - totalLiabilities;

  useEffect(() => {
    const calculate = async () => {
      setIsCalculating(true);
      const res = await intelligence.projectWealth(horizon, interest, monthly, netWorth);
      if (res && res !== "0") {
        setProjectedValue(res ?? '0');
      }
      setIsCalculating(false);
    };
    const timeout = setTimeout(calculate, 500);
    return () => clearTimeout(timeout);
  }, [horizon, interest, monthly, netWorth]);

  return (
    <div className="space-y-10">
      {/* Heading */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-5xl font-black leading-tight tracking-tighter uppercase italic">Asset Projections</h1>
          <p className="text-[#9db9a6] text-sm font-medium tracking-wide">Manage your net worth and simulate future wealth growth in real-time.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-border-dark text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#354c3e] transition-colors">
            <span className="material-symbols-outlined text-lg">download</span> EXPORT
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-background-dark text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-lg">add</span> ADD ASSET
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-2 rounded-2xl p-8 glass-card">
          <div className="flex justify-between items-center mb-4">
            <p className="text-[#9db9a6] text-[10px] font-black uppercase tracking-widest">Total Assets</p>
            <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
          </div>
          <p className="text-white text-4xl font-black leading-tight tracking-tighter">{formatMoney(totalAssets)}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="material-symbols-outlined text-primary text-sm">trending_up</span>
            <p className="text-primary text-[10px] font-black uppercase tracking-widest">+2.4% vs last month</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl p-8 glass-card">
          <div className="flex justify-between items-center mb-4">
            <p className="text-[#9db9a6] text-[10px] font-black uppercase tracking-widest">Total Liabilities</p>
            <span className="material-symbols-outlined text-secondary">payments</span>
          </div>
          <p className="text-white text-4xl font-black leading-tight tracking-tighter">{formatMoney(totalLiabilities)}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="material-symbols-outlined text-secondary text-sm">trending_down</span>
            <p className="text-secondary text-[10px] font-black uppercase tracking-widest">-1.1% debt reduction</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl p-8 bg-primary/10 border-2 border-primary/30 shadow-2xl shadow-primary/10">
          <div className="flex justify-between items-center mb-4">
            <p className="text-primary/70 text-[10px] font-black uppercase tracking-widest">Net Worth</p>
            <span className="material-symbols-outlined text-primary">auto_graph</span>
          </div>
          <p className="text-primary text-5xl font-black leading-tight tracking-tighter">{formatMoney(netWorth)}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="material-symbols-outlined text-primary text-sm">stars</span>
            <p className="text-primary text-[10px] font-black uppercase tracking-widest">+4.2% overall growth</p>
          </div>
        </div>
      </div>

      {/* Allocation */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-xl font-black uppercase tracking-widest italic">Asset Allocation</h2>
          <button className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">View Details <span className="material-symbols-outlined text-sm">chevron_right</span></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ASSETS.map((asset) => (
            <div key={asset.id} className="flex flex-col gap-4 p-5 rounded-2xl glass-card group hover:border-primary/50 transition-all cursor-pointer">
              <div 
                className="w-full aspect-video bg-cover bg-center rounded-xl grayscale group-hover:grayscale-0 transition-all duration-500 shadow-xl" 
                style={{ backgroundImage: `url(${asset.imageUrl})` }}
              ></div>
              <div>
                <div className="flex justify-between items-start mb-1">
                  <p className="text-white text-lg font-black italic uppercase tracking-tight">{asset.name}</p>
                  <span className="px-2 py-0.5 bg-white/10 rounded-md text-[8px] font-black uppercase tracking-widest">{asset.type}</span>
                </div>
                <p className="text-primary text-2xl font-black tracking-tight">{formatMoney(asset.value)}</p>
                <p className="text-[#9db9a6] text-[10px] font-bold mt-1 flex items-center gap-1 uppercase tracking-widest italic">
                  <span className="material-symbols-outlined text-xs">trending_up</span> {asset.trend}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projection Tool */}
      <div className="rounded-2xl overflow-hidden border border-border-dark glass-card">
        <div className="p-8 border-b border-border-dark">
          <h2 className="text-white text-2xl font-black italic uppercase tracking-widest">Wealth Projection Tool</h2>
          <p className="text-[#9db9a6] text-sm font-medium mt-1">Simulate your portfolio growth based on savings and market performance.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="p-8 space-y-10 bg-black/20 lg:border-r border-border-dark">
            <div className="space-y-5">
              <div className="flex justify-between font-black uppercase tracking-widest text-[10px]">
                <label className="text-gray-400">Investment Horizon</label>
                <span className="text-primary">{horizon} Years</span>
              </div>
              <input 
                className="w-full h-1.5 bg-border-dark rounded-full appearance-none cursor-pointer accent-primary" 
                type="range" min="1" max="50" value={horizon} onChange={(e) => setHorizon(parseInt(e.target.value))}
              />
              <div className="flex justify-between text-[8px] text-gray-500 font-black uppercase">
                <span>1 YR</span>
                <span>50 YRS</span>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex justify-between font-black uppercase tracking-widest text-[10px]">
                <label className="text-gray-400">Annual Interest (ROI)</label>
                <span className="text-primary">{interest}%</span>
              </div>
              <input 
                className="w-full h-1.5 bg-border-dark rounded-full appearance-none cursor-pointer accent-primary" 
                type="range" min="0" max="20" step="0.1" value={interest} onChange={(e) => setInterest(parseFloat(e.target.value))}
              />
              <div className="flex justify-between text-[8px] text-gray-500 font-black uppercase">
                <span>0%</span>
                <span>20%</span>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex justify-between font-black uppercase tracking-widest text-[10px]">
                <label className="text-gray-400">Monthly Contribution</label>
                <span className="text-primary">{formatMoney(monthly)}</span>
              </div>
              <input 
                className="w-full h-1.5 bg-border-dark rounded-full appearance-none cursor-pointer accent-primary" 
                type="range" min="0" max="10000" step="100" value={monthly} onChange={(e) => setMonthly(parseInt(e.target.value))}
              />
              <div className="flex justify-between text-[8px] text-gray-500 font-black uppercase">
                <span>{formatMoney(0)}</span>
                <span>{formatMoney(10000)}</span>
              </div>
            </div>

            <div className="pt-6 p-6 rounded-2xl bg-primary/10 border-2 border-primary/20 space-y-2 relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/5 -translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
              <div className="relative">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Projected Portfolio Value</p>
                <p className={`text-white text-4xl font-black italic transition-opacity ${isCalculating ? 'opacity-50' : 'opacity-100'}`}>
                  {formatMoney(parseFloat(String(projectedValue).replace(/,/g, '')) || 0)}
                </p>
                <p className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">+ Compound Gains Included</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 p-8 flex flex-col justify-between relative min-h-[500px]">
            <div className="flex justify-between items-center mb-8 relative z-10">
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-gray-600"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Baseline Path</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">System Projected Growth</span>
                </div>
              </div>
              <select className="bg-border-dark border-none text-[10px] font-black uppercase tracking-widest rounded-lg focus:ring-1 focus:ring-primary/50 py-1.5 pl-4 pr-10 text-white cursor-pointer">
                <option>Logarithmic View</option>
                <option>Linear View</option>
              </select>
            </div>

            <div className="flex-1 relative mt-10">
               {/* Visualizing growth with a stylized gradient SVG path */}
               <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 300" preserveAspectRatio="none">
                 <defs>
                   <linearGradient id="growthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" stopColor="#13ec5b22" />
                     <stop offset="100%" stopColor="#13ec5bff" />
                   </linearGradient>
                 </defs>
                 <path d="M0,280 Q250,270 500,200 T1000,50" fill="none" stroke="#13ec5b" strokeWidth="4" strokeLinecap="round" className="animate-[dash_3s_ease-out_forwards]" style={{ strokeDasharray: 1200, strokeDashoffset: 0 }} />
                 <path d="M0,280 Q250,275 500,250 T1000,200" fill="none" stroke="#5a7a63" strokeWidth="2" strokeDasharray="4" />
                 
                 <circle cx="750" cy="115" r="6" fill="#13ec5b" className="animate-pulse shadow-lg" />
                 <line x1="750" y1="115" x2="750" y2="290" stroke="#13ec5b55" strokeDasharray="4" />
               </svg>
               
               <div className="absolute top-[10%] left-[65%] glass-card p-4 rounded-xl border border-primary/30 shadow-2xl z-20">
                 <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest">Milestone 2038</p>
                 <p className="text-primary text-xl font-black italic">{formatMoney(2145000)}</p>
               </div>
            </div>

            <div className="flex justify-between mt-8 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">
              <span>Current</span>
              <span>10 Years</span>
              <span>20 Years</span>
              <span>30 Years</span>
              <span>40 Years</span>
            </div>

            <div className="mt-12 flex gap-5 p-6 rounded-2xl glass-card border-dashed border-primary/20 hover:border-primary/50 transition-all duration-300">
              <div className="bg-primary/20 size-12 rounded-full flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-2xl">lightbulb</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black italic uppercase tracking-widest text-white">Smart Strategy Insight</p>
                <p className="text-[11px] text-[#9db9a6] leading-relaxed font-medium">
                  Standard yield optimization indicates that by increasing your monthly deposits by <span className="text-primary font-bold">{formatMoney(200)}</span> today, you could potentially reach your {formatMoney(4000000)} goal <span className="text-white font-bold">4.2 years</span> earlier.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
