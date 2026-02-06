import React, { useState } from 'react';
import { useGoals } from '../context/GoalsContext';
import { useCurrency } from '../context/CurrencyContext';
import type { SavingsGoal } from '../types';

export const Goals = () => {
  const { goals, addGoal, updateGoal, deleteGoal } = useGoals();
  const { formatMoney } = useCurrency();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', targetAmount: 5000, currentAmount: 0 });

  const resetForm = () => {
    setForm({ name: '', targetAmount: 5000, currentAmount: 0 });
    setShowAdd(false);
    setEditingId(null);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addGoal({
      name: form.name.trim(),
      targetAmount: Math.max(0, form.targetAmount),
      currentAmount: Math.max(0, form.currentAmount),
    });
    resetForm();
  };

  const handleUpdate = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const g = goals.find((x) => x.id === id);
    if (!g) return;
    updateGoal(id, {
      name: form.name.trim() || g.name,
      targetAmount: Math.max(0, form.targetAmount),
      currentAmount: Math.max(0, form.currentAmount),
    });
    resetForm();
  };

  const startEdit = (g: SavingsGoal) => {
    setShowAdd(false);
    setEditingId(g.id);
    setForm({ name: g.name, targetAmount: g.targetAmount, currentAmount: g.currentAmount });
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-5xl font-black leading-tight tracking-tighter uppercase italic">Savings Goals</h1>
          <p className="text-[#9db9a6] text-sm font-medium tracking-wide">Track and manage what you’re saving for. Your primary goal appears on the overview.</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowAdd(true); setEditingId(null); setForm({ name: '', targetAmount: 5000, currentAmount: 0 }); }}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-background-dark text-xs font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined">add</span>
          Add Goal
        </button>
      </div>

      {/* Add / Edit form */}
      {showAdd && !editingId && (
        <div className="glass-card rounded-2xl border border-border-dark p-6">
          <h3 className="text-white text-lg font-black uppercase tracking-tight mb-4">
            {editingId ? 'Edit goal' : 'New goal'}
          </h3>
          <form
            onSubmit={(e) => (editingId ? handleUpdate(e, editingId) : handleAdd(e))}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="text-[10px] font-black text-[#9db9a6] uppercase tracking-widest mb-2 block">Goal name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Trip to Japan"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:ring-1 focus:ring-primary transition-all"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-[#9db9a6] uppercase tracking-widest mb-2 block">Target amount (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.targetAmount}
                onChange={(e) => setForm((f) => ({ ...f, targetAmount: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-[#9db9a6] uppercase tracking-widest mb-2 block">Current amount (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.currentAmount}
                onChange={(e) => setForm((f) => ({ ...f, currentAmount: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div className="flex items-end gap-3">
              <button
                type="submit"
                disabled={!form.name.trim()}
                className="px-6 py-3 rounded-xl bg-primary text-background-dark text-xs font-black uppercase tracking-widest hover:scale-[1.02] disabled:opacity-50 transition-all"
              >
                {editingId ? 'Save' : 'Add'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 rounded-xl bg-white/5 text-[#9db9a6] text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="glass-card rounded-2xl border border-border-dark p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-[#9db9a6]/50">flag</span>
            <p className="text-[#9db9a6] font-bold uppercase tracking-widest mt-4">No goals yet</p>
            <p className="text-gray-500 text-sm mt-1">Add a goal to start tracking progress. Your first goal will show on the overview.</p>
            <button
              type="button"
              onClick={() => { setShowAdd(true); setForm({ name: '', targetAmount: 5000, currentAmount: 0 }); }}
              className="mt-6 px-6 py-3 rounded-xl bg-primary text-background-dark text-xs font-black uppercase tracking-widest"
            >
              Add Goal
            </button>
          </div>
        ) : (
          goals.map((g) => {
            const percent = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
            const isEditing = editingId === g.id;

            return (
              <div
                key={g.id}
                className="glass-card rounded-2xl border border-border-dark overflow-hidden"
              >
                <div className="p-6">
                  {isEditing ? (
                    <form onSubmit={(e) => handleUpdate(e, g.id)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-[#9db9a6] uppercase tracking-widest mb-2 block">Name</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-[#9db9a6] uppercase tracking-widest mb-2 block">Target (USD)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.targetAmount}
                          onChange={(e) => setForm((f) => ({ ...f, targetAmount: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-[#9db9a6] uppercase tracking-widest mb-2 block">Current (USD)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.currentAmount}
                          onChange={(e) => setForm((f) => ({ ...f, currentAmount: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white"
                        />
                      </div>
                      <div className="md:col-span-3 flex gap-3">
                        <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-background-dark text-xs font-black">Save</button>
                        <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg bg-white/5 text-[#9db9a6] text-xs font-black">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="text-white text-lg font-black tracking-tight">{g.name}</h3>
                          <p className="text-[#9db9a6] text-sm mt-1">
                            {formatMoney(g.currentAmount)} / {formatMoney(g.targetAmount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(g)}
                            className="p-2 rounded-lg border border-white/10 text-[#9db9a6] hover:text-white hover:bg-white/5 transition-colors"
                            aria-label="Edit"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteGoal(g.id)}
                            className="p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                            aria-label="Delete"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="w-full h-2 bg-background-dark rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-2">{Math.round(percent)}% reached</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
