import { useEffect, useState } from 'react';
import { CategoryBarChart, TrendChart } from '@/components/charts';
import { TransactionTable } from '@/components/TransactionTable';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { MEMBER_META } from '@/lib/category-meta';
import { useApp } from '@/lib/context';
import {
  absDeltaText,
  fmtAmount,
  fmtYuan,
  pctDeltaText,
  shortMonthLabel,
} from '@/lib/format';
import type {
  BalanceSummary,
  CategoryBreakdown,
  MemberBreakdown,
  MonthlyReport,
  Transaction,
} from '@/lib/types';
import { cn } from '@/lib/utils';

function StatTile({
  label,
  value,
  tone,
  exact,
  delta,
}: {
  label: string;
  value: number;
  tone: 'good' | 'bad' | 'neutral';
  exact: string;
  delta?: string | null;
}) {
  return (
    <Card className="p-5">
      <div className="text-[13px] text-ink2">{label}</div>
      <div className="mt-2 flex items-end gap-2">
        <span
          className={cn(
            'num text-[26px] font-semibold leading-none',
            tone === 'good' ? 'text-goodText' : tone === 'bad' ? 'text-bad' : 'text-ink',
          )}
        >
          {fmtAmount(value)}
        </span>
        <span className="num mb-0.5 text-xs text-muted">{exact}</span>
      </div>
      {delta !== undefined && (
        <div
          className={cn(
            'mt-2 text-xs',
            tone === 'good' ? 'text-goodText' : tone === 'bad' ? 'text-bad' : 'text-muted',
          )}
        >
          {delta ?? '— 较上月'}
        </div>
      )}
    </Card>
  );
}

function MemberBars({ data }: { data: MemberBreakdown[] }) {
  const total = data.reduce((a, b) => a + b.amount, 0);
  const owners: (keyof typeof MEMBER_META)[] = ['me', 'spouse', 'shared'];
  return (
    <div className="space-y-4">
      {owners.map((o) => {
        const meta = MEMBER_META[o];
        const found = data.find((d) => d.owner === o);
        const amount = found?.amount ?? 0;
        const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
        return (
          <div key={o}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="grid h-5 w-5 place-items-center rounded-full text-[10px] text-white"
                  style={{ background: meta.color }}
                >
                  {meta.label[0]}
                </span>
                {meta.label}
              </span>
              <span className="num font-medium">{fmtAmount(amount)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/[.05]">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: meta.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { version, currentMonth, categories, toast, setView } = useApp();
  const [monthly, setMonthly] = useState<MonthlyReport[]>([]);
  const [catBreakdown, setCatBreakdown] = useState<CategoryBreakdown[]>([]);
  const [memberBreakdown, setMemberBreakdown] = useState<MemberBreakdown[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<BalanceSummary | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [m, cb, mb, tx, s] = await Promise.all([
          api.getMonthlyReport(12),
          api.getCategoryBreakdown(currentMonth, 'expense'),
          api.getMemberBreakdown(currentMonth, 'expense'),
          api.listTransactions({ month: currentMonth }),
          api.getBalanceSummary(),
        ]);
        if (!alive) return;
        setMonthly(m);
        setCatBreakdown(cb);
        setMemberBreakdown(mb);
        setRecent(tx.slice(0, 5));
        setSummary(s);
      } catch (e) {
        toast(e instanceof Error ? e.message : '加载失败');
      }
    })();
    return () => {
      alive = false;
    };
  }, [version, currentMonth, toast]);

  const cur = monthly.length > 0 ? monthly[monthly.length - 1] : undefined;
  const prev = monthly.length > 1 ? monthly[monthly.length - 2] : undefined;
  const curIncome = cur?.income ?? 0;
  const curExpense = cur?.expense ?? 0;
  const curBalance = cur?.balance ?? 0;

  const rangeLabel =
    monthly.length > 0
      ? `${shortMonthLabel(monthly[0].month)} ~ ${shortMonthLabel(monthly[monthly.length - 1].month)}`
      : '暂无数据';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          label="本月收入"
          value={curIncome}
          tone="good"
          exact={fmtYuan(curIncome)}
          delta={pctDeltaText(curIncome, prev?.income)}
        />
        <StatTile
          label="本月支出"
          value={curExpense}
          tone="bad"
          exact={fmtYuan(curExpense)}
          delta={pctDeltaText(curExpense, prev?.expense)}
        />
        <StatTile
          label="本月结余"
          value={curBalance}
          tone={curBalance >= 0 ? 'good' : 'bad'}
          exact={fmtYuan(curBalance)}
          delta={absDeltaText(curBalance, prev?.balance)}
        />
        <Card className="border-brand/20 bg-gradient-to-br from-brand-50 to-surface p-5">
          <div className="text-[13px] text-ink2">净资产</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="num text-[26px] font-semibold leading-none text-ink">
              {fmtAmount(summary?.net_worth ?? 0)}
            </span>
            <span className="num mb-0.5 text-xs text-muted">
              {fmtYuan(summary?.net_worth ?? 0)}
            </span>
          </div>
          <div className="mt-2 text-xs text-ink2">
            其中{' '}
            <span className="font-semibold text-goodText">
              流动资产 {fmtAmount(summary?.liquid_assets ?? 0)}
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-medium">月度收支趋势</div>
              <div className="mt-0.5 text-xs text-muted">近 12 个月（{rangeLabel}）</div>
            </div>
            <div className="flex items-center gap-3 text-xs text-ink2">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#0ca30c' }} />
                收入
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#d03b3b' }} />
                支出
              </span>
            </div>
          </div>
          <div className="h-60">
            <TrendChart data={monthly} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-1 text-[15px] font-medium">本月支出分类</div>
          <div className="mb-4 text-xs text-muted">钱花去了哪</div>
          <div className="h-60">
            <CategoryBarChart data={catBreakdown} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-1">
          <div className="mb-1 text-[15px] font-medium">本月支出 · 按成员</div>
          <div className="mb-4 text-xs text-muted">谁花了多少</div>
          <MemberBars data={memberBreakdown} />
        </Card>

        <Card className="p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[15px] font-medium">最近流水</div>
            <button
              type="button"
              onClick={() => setView('transactions')}
              className="-mx-2 -my-1 px-2 py-1 text-[13px] text-brand hover:text-brand-700"
            >
              查看全部 →
            </button>
          </div>
          <div className="-mx-5 overflow-x-auto px-5">
            <TransactionTable txs={recent} categories={categories} />
          </div>
        </Card>
      </div>
    </div>
  );
}
