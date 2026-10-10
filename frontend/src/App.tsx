import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { RecordModal } from '@/components/RecordModal';
import { Sidebar } from '@/components/Sidebar';
import { api, setUnauthorizedHandler } from '@/lib/api';
import { AppContext, type ViewKey } from '@/lib/context';
import { currentMonth } from '@/lib/format';
import type { Category, Template, Transaction } from '@/lib/types';
import Balance from '@/pages/Balance';
import Categories from '@/pages/Categories';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Reports from '@/pages/Reports';
import Transactions from '@/pages/Transactions';

const TITLES: Record<ViewKey, string> = {
  dashboard: '仪表盘',
  transactions: '流水',
  reports: '报表',
  balance: '资产负债',
  categories: '分类管理',
};

export default function App() {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [version, setVersion] = useState(0);
  const [toastMsg, setToastMsg] = useState<{ id: number; msg: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  const toast = useCallback((msg: string) => {
    setToastMsg({ id: Date.now(), msg });
  }, []);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const clearAuth = useCallback(() => {
    setUsername(null);
    setAuthenticated(false);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 1800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Bootstrap: check for an existing session cookie on mount.
  useEffect(() => {
    let alive = true;
    api
      .me()
      .then((r) => {
        if (!alive) return;
        setUsername(r.username);
        setAuthenticated(true);
      })
      .catch(() => {
        if (!alive) return;
        clearAuth();
      })
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [clearAuth]);

  // Any authenticated request that gets a 401 clears auth and returns to Login.
  useEffect(() => {
    setUnauthorizedHandler(() => clearAuth());
    return () => setUnauthorizedHandler(null);
  }, [clearAuth]);

  useEffect(() => {
    if (!authenticated) return;
    api
      .listCategories()
      .then(setCategories)
      .catch((e) => toast(e instanceof Error ? e.message : '加载分类失败'));
  }, [version, toast, authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    api.listTemplates().then(setTemplates).catch(() => {});
  }, [version, authenticated]);

  const month = useMemo(() => currentMonth(), []);

  const openAdd = useCallback(() => {
    setEditing(null);
    setRecordOpen(true);
  }, []);

  const openEdit = useCallback((tx: Transaction) => {
    setEditing(tx);
    setRecordOpen(true);
  }, []);

  const login = useCallback(async (name: string, password: string) => {
    const r = await api.login(name, password);
    setUsername(r.username);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors — local state is cleared regardless.
    }
    clearAuth();
  }, [clearAuth]);

  const onBackup = useCallback(() => {
    api
      .getBackup()
      .then((r) => toast(r && r.file ? `备份成功：${r.file}` : '备份成功'))
      .catch((e) => toast(e instanceof Error ? e.message : '备份失败'));
  }, [toast]);

  const ctx = useMemo(
    () => ({
      view,
      setView,
      version,
      bump,
      toast,
      categories,
      templates,
      currentMonth: month,
      openAdd,
      openEdit,
      username,
      authenticated,
      login,
      logout,
    }),
    [
      view,
      version,
      bump,
      toast,
      categories,
      templates,
      month,
      openAdd,
      openEdit,
      username,
      authenticated,
      login,
      logout,
    ],
  );

  return (
    <AppContext.Provider value={ctx}>
      {checking ? (
        <div className="flex h-screen items-center justify-center bg-page">
          <div className="flex items-center gap-3 text-sm text-muted">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 3a9 9 0 1 0 9 9" />
            </svg>
            加载中…
          </div>
        </div>
      ) : !authenticated ? (
        <Login />
      ) : (
        <div className="flex h-screen">
          <Sidebar onBackup={onBackup} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header title={TITLES[view]} onAdd={openAdd} />
            <main className="flex-1 overflow-y-auto p-6">
              {view === 'dashboard' && <Dashboard />}
              {view === 'transactions' && <Transactions />}
              {view === 'reports' && <Reports />}
              {view === 'balance' && <Balance />}
              {view === 'categories' && <Categories />}
            </main>
          </div>
        </div>
      )}
      {authenticated && (
        <RecordModal open={recordOpen} onOpenChange={setRecordOpen} editing={editing} />
      )}
      {toastMsg && (
        <div
          key={toastMsg.id}
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-sm text-surface shadow-lg"
        >
          {toastMsg.msg}
        </div>
      )}
    </AppContext.Provider>
  );
}
