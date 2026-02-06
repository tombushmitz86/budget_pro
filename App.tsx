
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CurrencyProvider } from './context/CurrencyContext';
import { GoalsProvider } from './context/GoalsContext';
import { N26ConnectionProvider } from './context/N26ConnectionContext';
import { DataSourceProvider } from './context/DataSourceContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Goals } from './pages/Goals';
import { N26ConnectCallback } from './pages/N26ConnectCallback';
import { Budgets } from './pages/Budgets';
import { Plan } from './pages/Plan';
import { Assets } from './pages/Assets';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';

const AddTransaction = () => (
  <div className="p-20 text-center glass-card rounded-3xl border-dashed border-2 border-border-dark">
    <span className="material-symbols-outlined text-6xl text-primary/20 mb-6">add_circle</span>
    <h2 className="text-4xl font-black italic uppercase italic">Data Entry</h2>
    <p className="text-gray-500 mt-4 font-bold uppercase tracking-widest text-xs">New entry wizard initializing...</p>
  </div>
);

const App: React.FC = () => {
  return (
    <CurrencyProvider>
    <GoalsProvider>
    <N26ConnectionProvider>
    <DataSourceProvider>
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/connect/n26/callback" element={<N26ConnectCallback />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/add" element={<AddTransaction />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
    </DataSourceProvider>
    </N26ConnectionProvider>
    </GoalsProvider>
    </CurrencyProvider>
  );
};

export default App;
