/** Format an integer-yuan value as 万 (e.g. 4.6万); strips a trailing ".0". */
export function fmtWan(v: number): string {
  if (v === 0) return '0';
  const w = v / 10000;
  if (Math.abs(w) >= 100) return `${Math.round(w)}万`;
  const r = Math.round(w * 10) / 10;
  const text = Number.isInteger(r) ? String(r) : r.toFixed(1);
  return `${text}万`;
}

/** Format an integer-yuan value as ¥ with grouping (e.g. ¥46,000). */
export function fmtYuan(v: number): string {
  return `¥${v.toLocaleString('zh-CN')}`;
}

/** Format a signed amount (e.g. +30,000 / -12,000). */
export function fmtSigned(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toLocaleString('zh-CN')}`;
}

/** Primary amount format: >= 1万 shows 万, otherwise exact yuan. */
export function fmtAmount(v: number): string {
  if (v === 0) return '0';
  if (v >= 10000 || v <= -10000) return fmtWan(v);
  return fmtYuan(v);
}

export function monthOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonth(): string {
  return monthOf(new Date());
}

export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** "2026-10" -> "2026年10月" */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `${y}年${Number(m)}月`;
}

/** "2026-10" -> "26/10" */
export function shortMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `${y.slice(2)}/${m}`;
}

/** List of recent months ending at the current month, newest first. */
export function recentMonths(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    out.push(monthOf(d));
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

/** "% change vs previous period" helper; null when not computable. */
export function pctDeltaText(cur: number, prev: number | undefined): string | null {
  if (prev === undefined || prev === 0) return null;
  const p = ((cur - prev) / prev) * 100;
  return `${p >= 0 ? '↑' : '↓'} ${Math.abs(p).toFixed(1)}% 较上月`;
}

/** "absolute change vs previous period" helper; null when not computable. */
export function absDeltaText(cur: number, prev: number | undefined): string | null {
  if (prev === undefined) return null;
  const d = cur - prev;
  return `${d >= 0 ? '↑' : '↓'} ¥${Math.abs(d).toLocaleString('zh-CN')} 较上月`;
}
