import { useEffect, useState } from 'react';
import { CompositionDonut, SavingsBarChart, type DonutDatum } from '@/components/charts';
import { Card } from '@/components/ui/card';
import { TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { useApp } from '@/lib/context';
import { fmtWan, fmtYuan } from '@/lib/format';
import type { MonthlyReport } from '@/lib/types';
import { cn } from '@/lib/utils';

function ReportKpi({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: number;
  tone: 'good' | 'bad' | 'neutral';
  sub: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-[13px] text-ink2">{label}</div>
      <div
        className={cn(
          'num mt-2 text-[24px] font-semibold',
          tone === 'good' ? 'text-goodText' : tone === 'bad' ? 'text-bad' : 'text-ink',
        )}
      >
        {fmtWan(value)}
      </div>
      <div className="mt-1 text-xs text-muted">{sub}</div>
    </Card>
  );
}

export default function Reports() {
  const { version, toast } = useApp();
  const [monthly, setMonthly] = useState<MonthlyReport[]>([]);
  const [donut, setDonut] = useState<DonutDatum[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await api.getMonthlyReport(12);
        if (!alive) return;
        setMonthly(m);

        const breakdowns = await Promise.all(
          m.map((mm) => api.getCategoryBreakdown(mm.month, 'expense')),
        );
        if (!alive) return;
        const agg = new Map<number, { name: string; amount: number }>();
        for (const arr of breakdowns) {
          for (const c of arr) {
            const cur = agg.get(c.category_id) ?? { name: c.name, amount: 0 };
            cur.amount += c.amount;
            agg.set(c.category_id, cur);
          }
        }
        setDonut(
          Array.from(agg.values())
            .sort((a, b) => b.amount - a.amount)
            .map((d) => ({ name: d.name, amount: d.amount })),
        );
      } catch (e) {
        toast(e instanceof Error ? e.message : '加载报表失败');
      }
    })();
    return () => {
      alive = false;
    };
  }, [version, toast]);

  const income = monthly.reduce((a, m) => a + m.income, 0);
  const expense = monthly.reduce((a, m) => a + m.expense, 0);
  const balance = income - expense;
  const savRate = income > 0 ? `${((balance / income) * 100).toFixed(1)}%` : '—';
  const avg = Math.round(balance / (monthly.length || 1));

  const recent6 = [...monthly].slice(-6).reverse();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <ReportKpi label="年收入" value={income} tone="good" sub={fmtYuan(income)} />
        <ReportKpi label="年支出" value={expense} tone="bad" sub={fmtYuan(expense)} />
        <ReportKpi label="年结余" value={balance} tone={balance >= 0 ? 'good' : 'bad'} sub={`储蓄率 ${savRate}`} />
        <ReportKpi label="月均结余" value={avg} tone="neutral" sub={fmtYuan(avg)} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-1 text-[15px] font-medium">每月结余</div>
          <div className="mb-4 text-xs text-muted">收入 − 支出，回答「能不能存下钱」</div>
          <div className="h-72">
            <SavingsBarChart data={monthly} />
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-1 text-[15px] font-medium">全年支出构成</div>
          <div className="mb-4 text-xs text-muted">各类别占比</div>
          <div className="h-72">
            <CompositionDonut data={donut} />
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4 text-[15px] font-medium">
          近 6 个月收支明细
        </div>
        <div className="overflow-x-auto">
          {recent6.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">暂无数据</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <TableHead className="px-5 py-2.5 font-medium">月份</TableHead>
                  <TableHead className="px-5 py-2.5 text-right font-medium">收入</TableHead>
                  <TableHead className="px-5 py-2.5 text-right font-medium">支出</TableHead>
                  <TableHead className="px-5 py-2.5 text-right font-medium">结余</TableHead>
                  <TableHead className="px-5 py-2.5 text-right font-medium">储蓄率</TableHead>
                </tr>
              </thead>
              <TableBody className="divide-y divide-line">
                {recent6.map((m) => {
                  const rate = m.income > 0 ? `${((m.balance / m.income) * 100).toFixed(1)}%` : '—';
                  return (
                    <TableRow key={m.month}>
                      <TableCell className="num px-5 py-2.5">{m.month}</TableCell>
                      <TableCell className="num px-5 py-2.5 text-right text-goodText">
                        {m.income.toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell className="num px-5 py-2.5 text-right text-bad">
                        {m.expense.toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'num px-5 py-2.5 text-right',
                          m.balance >= 0 ? 'text-goodText' : 'text-bad',
                        )}
                      >
                        {m.balance.toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell className="num px-5 py-2.5 text-right">{rate}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
