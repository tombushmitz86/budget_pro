
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Budgets } from './pages/Budgets';
import { Assets } from './pages/Assets';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';

// Placeholder pages to maintain structural integrity
const Reports = () => (
  <div className="p-20 text-center glass-card rounded-3xl border-dashed border-2 border-border-dark">
    <span className="material-symbols-outlined text-6xl text-primary/20 mb-6">monitoring</span>
    <h2 className="text-4xl font-black italic uppercase italic">Market Analytics</h2>
    <p className="text-gray-500 mt-4 font-bold uppercase tracking-widest text-xs">Deep dive analysis engine coming soon...</p>
  </div>
);

const AddTransaction = () => (
  <div className="p-20 text-center glass-card rounded-3xl border-dashed border-2 border-border-dark">
    <span className="material-symbols-outlined text-6xl text-primary/20 mb-6">add_circle</span>
    <h2 className="text-4xl font-black italic uppercase italic">Data Entry</h2>
    <p className="text-gray-500 mt-4 font-bold uppercase tracking-widest text-xs">New entry wizard initializing...</p>
  </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/add" element={<AddTransaction />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
