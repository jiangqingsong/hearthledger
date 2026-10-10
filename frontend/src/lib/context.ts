import { createContext, useContext } from 'react';
import type { Category, Template, Transaction } from './types';

export type ViewKey = 'dashboard' | 'transactions' | 'reports' | 'balance' | 'categories';

export interface AppContextValue {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  version: number;
  bump: () => void;
  toast: (msg: string) => void;
  categories: Category[];
  templates: Template[];
  currentMonth: string;
  openAdd: () => void;
  openEdit: (tx: Transaction) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppContext.Provider');
  return ctx;
}
