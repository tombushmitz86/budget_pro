import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { SavingsGoal } from '../types';

const STORAGE_KEY = 'budgetpro_savings_goals';

/** Load only user-saved goals from storage. Returns [] when empty so real data mode shows no goals until user adds them. */
function loadGoals(): SavingsGoal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavingsGoal[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

function saveGoals(goals: SavingsGoal[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  } catch (_) {}
}

interface GoalsContextValue {
  goals: SavingsGoal[];
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  updateGoal: (id: string, update: Partial<Omit<SavingsGoal, 'id'>>) => void;
  deleteGoal: (id: string) => void;
  /** First goal for overview widget (or undefined if none) */
  primaryGoal: SavingsGoal | undefined;
}

const GoalsContext = createContext<GoalsContextValue | null>(null);

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<SavingsGoal[]>(loadGoals);

  useEffect(() => {
    saveGoals(goals);
  }, [goals]);

  const addGoal = useCallback((goal: Omit<SavingsGoal, 'id'>) => {
    const id = `g-${Date.now()}`;
    setGoals((prev) => [...prev, { ...goal, id }]);
  }, []);

  const updateGoal = useCallback((id: string, update: Partial<Omit<SavingsGoal, 'id'>>) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...update } : g))
    );
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const primaryGoal = goals[0];

  const value: GoalsContextValue = {
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    primaryGoal,
  };

  return (
    <GoalsContext.Provider value={value}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals(): GoalsContextValue {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals must be used within GoalsProvider');
  return ctx;
}
