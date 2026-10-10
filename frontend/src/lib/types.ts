export type Direction = 'income' | 'expense';
export type Owner = 'me' | 'spouse' | 'shared';
export type Kind = 'asset' | 'liability';
export type AssetSubtype = 'deposit' | 'cash' | 'property' | 'car';
export type LiabilitySubtype = 'mortgage' | 'credit_card' | 'car_loan' | 'consumer_loan';
export type Subtype = AssetSubtype | LiabilitySubtype;

export interface Category {
  id: number;
  name: string;
  direction: Direction;
  parent_id: number | null;
  sort_order: number;
  hint: string | null;
}

export interface Transaction {
  id: number;
  date: string; // YYYY-MM-DD
  direction: Direction;
  amount: number; // integer yuan
  category_id: number;
  owner: Owner;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface BalanceItem {
  id: number;
  name: string;
  kind: Kind;
  subtype: Subtype;
  owner: Owner;
  current_value: number; // integer yuan
  note: string | null;
  updated_at: string;
}

export interface Template {
  id: number;
  name: string;
  direction: Direction;
  amount: number;
  category_id: number;
  owner: Owner;
  note: string | null;
  sort_order: number;
}

export interface BalanceSummary {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  liquid_assets: number;
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryBreakdown {
  category_id: number;
  name: string;
  amount: number;
}

export interface MemberBreakdown {
  owner: Owner;
  amount: number;
}
