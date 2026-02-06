
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Sidebar = () => {
  const navItems = [
    { name: 'Overview', icon: 'grid_view', path: '/' },
    { name: 'Analytics', icon: 'monitoring', path: '/reports' },
    { name: 'Planning', icon: 'event_note', path: '/budgets' },
    { name: 'Plan', icon: 'savings', path: '/plan' },
    { name: 'Goals', icon: 'flag', path: '/goals' },
    { name: 'Transactions', icon: 'receipt_long', path: '/transactions' },
    { name: 'Portfolio', icon: 'account_balance', path: '/assets' },
    { name: 'Settings', icon: 'tune', path: '/settings' },
  ];

  return (
    <aside className="w-64 flex flex-col justify-between border-r border-border-dark bg-background-dark p-6 h-screen sticky top-0">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-1">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center rotate-3 shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-background-dark font-bold">account_balance_wallet</span>
            </div>
            <h1 className="text-white text-xl font-black tracking-tight leading-none italic uppercase">BudgetPro</h1>
          </div>
          <p className="text-[#9db9a6] text-[10px] font-bold uppercase tracking-widest mt-1 ml-11">Wealth Intelligence</p>
        </div>
        
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-primary text-background-dark font-bold shadow-lg shadow-primary/10' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}
              `}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <p className="text-sm">{item.name}</p>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 group hover:border-primary/30 transition-colors">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Plan Status</p>
          <p className="text-xs font-black text-white italic uppercase tracking-tight">Active Growth</p>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-3">
            <div className="h-full bg-primary" style={{ width: '100%' }}></div>
          </div>
        </div>
        
        <NavLink to="/add" className="flex items-center justify-center gap-2 rounded-xl h-12 bg-primary text-background-dark text-xs font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest">
          <span className="material-symbols-outlined">add</span>
          <span>New Entry</span>
        </NavLink>
      </div>
    </aside>
  );
};

const Header = () => {
  const location = useLocation();
  const path = location.pathname.substring(1);
  const titleMap: Record<string, string> = {
    '': 'Intelligence Overview',
    'reports': 'Market Analytics',
    'budgets': 'Asset Planning',
    'plan': 'Saving Plan',
    'goals': 'Savings Goals',
    'transactions': 'Unified Ledger',
    'assets': 'Wealth Portfolio',
    'settings': 'System Control',
    'add': 'Data Input'
  };
  const title = titleMap[path] || 'Intelligence Overview';

  return (
    <header className="flex items-center justify-between border-b border-border-dark px-10 py-5 bg-background-dark/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="flex flex-col">
        <h2 className="text-white text-2xl font-black tracking-tight leading-none uppercase italic">{title}</h2>
        <div className="flex items-center gap-2 mt-1">
           <p className="text-[#9db9a6] text-[10px] font-bold uppercase tracking-widest">Institutional Insights</p>
           <span className="size-1 rounded-full bg-gray-600"></span>
           <p className="text-[#36a18b] text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
             <span className="size-1.5 rounded-full bg-[#36a18b] animate-pulse"></span>
             N26 Linked
           </p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 glass-card rounded-full px-4 py-2 border-white/10">
          <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
          <input 
            className="bg-transparent border-none text-xs focus:ring-0 w-48 text-white placeholder:text-gray-500" 
            placeholder="Search records..."
          />
        </div>
        
        <div className="flex items-center gap-4 border-l border-border-dark pl-6">
          <button className="relative size-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <div className="absolute top-2 right-2 size-2 bg-secondary rounded-full border-2 border-background-dark"></div>
          </button>
          
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="text-right">
              <p className="text-sm font-black text-white leading-none">Alex Rivera</p>
              <p className="text-[10px] text-primary mt-1 font-bold uppercase tracking-widest">Premium Member</p>
            </div>
            <div 
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-border-dark group-hover:border-primary transition-colors"
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA8utrREryVMNZuV7ftIJatrxt0iqOnKeyHhRIY3YkFVJ8Z1emzRVazT9VwSoNEUEaQGPHyut75dvjZdNJJ1pOlkmWrQ7HDLvamPekX6M3d4Naty7nhU36VJlTsiGPjJbNQTvi8E_l7km-_WaWGn6qOh0r0TPsw7Bq1AsIBJQ3sHMlyPkL8styWt5Y9_ucQ-H-PeswRhiz667k45yCIOllXp4PIrGlItl2VIFQmaPiax3i9w-ohJpI-150KNUatn64tqPsUXGKZauo")' }}
            ></div>
          </div>
        </div>
      </div>
    </header>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-background-dark text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1400px] mx-auto p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
