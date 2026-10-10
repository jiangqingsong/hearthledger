import type {
  BalanceItem,
  BalanceSummary,
  Category,
  CategoryBreakdown,
  MemberBreakdown,
  MonthlyReport,
  Template,
  Transaction,
} from './types';

const BASE = '/api';

/** Called whenever an authenticated request receives a 401 (see `skipAuthRedirect`). */
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  unauthorizedHandler = fn;
}

interface HttpInit extends RequestInit {
  /**
   * Skip the global 401 handling. Used for the login call (401 means "wrong
   * credentials", not "session expired") and the `me` bootstrap check.
   */
  skipAuthRedirect?: boolean;
}

async function http<T>(path: string, init?: HttpInit): Promise<T> {
  const { skipAuthRedirect = false, ...rest } = init ?? {};

  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...rest,
  });

  if (res.status === 401 && !skipAuthRedirect) {
    unauthorizedHandler?.();
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body.detail === 'string') {
        message = body.detail;
      } else if (body && typeof body === 'object') {
        message = JSON.stringify(body);
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export interface TransactionBody {
  date: string;
  direction: string;
  amount: number;
  category_id: number;
  owner: string;
  note?: string | null;
}

export const api = {
  // Transactions
  listTransactions: (params: {
    month?: string;
    owner?: string;
    category_id?: number | string;
    direction?: string;
  } = {}) => http<Transaction[]>(`/transactions${qs(params)}`),

  createTransaction: (body: TransactionBody) =>
    http<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(body) }),

  updateTransaction: (id: number, body: Partial<TransactionBody>) =>
    http<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteTransaction: (id: number) =>
    http<void>(`/transactions/${id}`, { method: 'DELETE' }),

  copyLastMonth: (from_month: string, to_month: string) =>
    http<{ copied: number }>('/transactions/copy-last-month', {
      method: 'POST',
      body: JSON.stringify({ from_month, to_month }),
    }),

  // Categories
  listCategories: () => http<Category[]>('/categories'),

  createCategory: (body: {
    name: string;
    direction: string;
    parent_id?: number | null;
    sort_order?: number;
    hint?: string | null;
  }) => http<Category>('/categories', { method: 'POST', body: JSON.stringify(body) }),

  updateCategory: (
    id: number,
    body: Partial<{
      name: string;
      direction: string;
      parent_id: number | null;
      sort_order: number;
      hint: string | null;
    }>,
  ) => http<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteCategory: (id: number) => http<void>(`/categories/${id}`, { method: 'DELETE' }),

  // Balance
  listBalanceItems: () => http<BalanceItem[]>('/balance-items'),

  createBalanceItem: (body: {
    name: string;
    kind: string;
    subtype: string;
    owner: string;
    current_value: number;
    note?: string | null;
  }) => http<BalanceItem>('/balance-items', { method: 'POST', body: JSON.stringify(body) }),

  updateBalanceItem: (
    id: number,
    body: Partial<{
      name: string;
      kind: string;
      subtype: string;
      owner: string;
      current_value: number;
      note: string | null;
    }>,
  ) => http<BalanceItem>(`/balance-items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteBalanceItem: (id: number) =>
    http<void>(`/balance-items/${id}`, { method: 'DELETE' }),

  getBalanceSummary: () => http<BalanceSummary>('/balance/summary'),

  // Templates
  listTemplates: () => http<Template[]>('/templates'),

  createTemplate: (body: {
    name: string;
    direction: string;
    amount: number;
    category_id: number;
    owner: string;
    note?: string | null;
    sort_order?: number;
  }) => http<Template>('/templates', { method: 'POST', body: JSON.stringify(body) }),

  updateTemplate: (
    id: number,
    body: Partial<{
      name: string;
      direction: string;
      amount: number;
      category_id: number;
      owner: string;
      note: string | null;
      sort_order: number;
    }>,
  ) => http<Template>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteTemplate: (id: number) => http<void>(`/templates/${id}`, { method: 'DELETE' }),

  // Reports
  getMonthlyReport: (months = 12) =>
    http<MonthlyReport[]>(`/reports/monthly?months=${months}`),

  getCategoryBreakdown: (month: string, direction: string) =>
    http<CategoryBreakdown[]>(`/reports/category-breakdown${qs({ month, direction })}`),

  getMemberBreakdown: (month: string, direction: string) =>
    http<MemberBreakdown[]>(`/reports/member-breakdown${qs({ month, direction })}`),

  // Backup
  getBackup: () => http<{ ok: boolean; file: string }>('/backup'),

  // Auth
  login: (username: string, password: string) =>
    http<{ username: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      skipAuthRedirect: true,
    }),

  logout: () => http<{ ok: true }>('/auth/logout', { method: 'POST' }),

  me: () => http<{ username: string }>('/auth/me', { skipAuthRedirect: true }),

  changePassword: (current_password: string, new_password: string) =>
    http<{ ok: true }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),
};
