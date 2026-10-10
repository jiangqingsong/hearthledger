import type { Direction, Owner, Subtype } from './types';

export const OWNER_LABELS: Record<Owner, string> = {
  me: '我',
  spouse: '媳妇',
  shared: '共同',
};

export const MEMBER_META: Record<Owner, { label: string; color: string }> = {
  me: { label: '我', color: '#2a78d6' },
  spouse: { label: '媳妇', color: '#eb6834' },
  shared: { label: '共同', color: '#1baf7a' },
};

export const SUBTYPE_LABELS: Record<Subtype, string> = {
  deposit: '存款/现金',
  cash: '现金',
  property: '房产',
  car: '车',
  mortgage: '房贷',
  credit_card: '信用卡',
  car_loan: '车贷',
  consumer_loan: '消费贷',
};

export const SUBTYPE_ICONS: Record<Subtype, string> = {
  deposit: '🏦',
  cash: '💵',
  property: '🏠',
  car: '🚗',
  mortgage: '🏠',
  credit_card: '💳',
  car_loan: '🚗',
  consumer_loan: '💳',
};

/** Stable color for a category name (same category = same color everywhere). */
export function categoryColor(name: string, direction?: Direction): string {
  return categoryMeta(name, direction).color;
}

/** Stable icon + color for a category name. */
export function categoryMeta(
  name: string,
  direction?: Direction,
): { color: string; icon: string } {
  const n = name;

  if (direction === 'income') {
    if (n.includes('工资')) return { color: '#0ca30c', icon: '💼' };
    if (n.includes('补课')) return { color: '#0ca30c', icon: '📚' };
    return { color: '#0ca30c', icon: '💰' };
  }

  if (n.includes('房贷')) return { color: '#2a78d6', icon: '🏠' };
  if (n.includes('吃喝') || n.includes('餐饮')) return { color: '#eb6834', icon: '🍚' };
  if (n.includes('孩子')) return { color: '#1baf7a', icon: '🧒' };
  if (n.includes('购物') || n.includes('网购') || n.includes('娱乐'))
    return { color: '#eda100', icon: '🛒' };
  if (n.includes('交通') || n.includes('汽车')) return { color: '#e87ba4', icon: '🚗' };
  if (n.includes('保险')) return { color: '#008300', icon: '🛡️' };
  if (n.includes('水电煤') || n.includes('通讯')) return { color: '#6250d6', icon: '💡' };
  return { color: '#e34948', icon: '📦' };
}
