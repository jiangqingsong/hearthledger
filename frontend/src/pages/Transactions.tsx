import { useEffect, useMemo, useState } from 'react';
import { TransactionTable } from '@/components/TransactionTable';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useApp } from '@/lib/context';
import { recentMonths, monthLabel } from '@/lib/format';
import type { Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';

type DirFilter = 'all' | 'income' | 'expense';

export default function Transactions() {
  const { version, currentMonth, categories, toast, openEdit } = useApp();
  const [month, setMonth] = useState(currentMonth);
  const [dir, setDir] = useState<DirFilter>('all');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [owner, setOwner] = useState<string>('all');
  const [allTxs, setAllTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    api
      .listTransactions({ month })
      .then(setAllTxs)
      .catch((e) => toast(e instanceof Error ? e.message : '加载流水失败'));
  }, [version, month, toast]);

  const filtered = useMemo(
    () =>
      allTxs.filter(
        (t) =>
          (dir === 'all' || t.direction === dir) &&
          (categoryId === 'all' || t.category_id === Number(categoryId)) &&
          (owner === 'all' || t.owner === owner),
      ),
    [allTxs, dir, categoryId, owner],
  );

  const income = allTxs
    .filter((t) => t.direction === 'income')
    .reduce((a, t) => a + t.amount, 0);
  const expense = allTxs
    .filter((t) => t.direction === 'expense')
    .reduce((a, t) => a + t.amount, 0);

  const months = useMemo(() => recentMonths(24), []);

  const selectClass =
    'h-auto justify-between gap-2 rounded-lg border-line bg-surface px-3 py-1.5 text-sm text-ink2 shadow-none';

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-line bg-page p-1">
            {(
              [
                ['all', '全部'],
                ['income', '收入'],
                ['expense', '支出'],
              ] as [DirFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDir(value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm',
                  dir === value ? 'bg-surface font-medium shadow-sm text-ink' : 'text-ink2',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className={cn(selectClass, 'min-w-[7rem]')}>
              <SelectValue placeholder="全部类别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类别</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className={cn(selectClass, 'min-w-[7rem]')}>
              <SelectValue placeholder="全部成员" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部成员</SelectItem>
              <SelectItem value="me">我</SelectItem>
              <SelectItem value="spouse">媳妇</SelectItem>
              <SelectItem value="shared">共同</SelectItem>
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className={cn(selectClass, 'min-w-[7.5rem]')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {monthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />
          <div className="text-sm text-ink2">
            本月{' '}
            <span className="num font-semibold text-goodText">{income.toLocaleString('zh-CN')}</span>{' '}
            收 ·{' '}
            <span className="num font-semibold text-bad">{expense.toLocaleString('zh-CN')}</span> 支
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <TransactionTable
            txs={filtered}
            categories={categories}
            showActions
            onEdit={openEdit}
          />
        </div>
      </Card>
    </div>
  );
}
