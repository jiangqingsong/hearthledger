import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoryBreakdown, MonthlyReport } from '@/lib/types';
import { fmtWan, fmtYuan, shortMonthLabel } from '@/lib/format';
import { categoryColor } from '@/lib/category-meta';

const INK = '#6b6a63';
const INK2 = '#52514e';
const GRID = '#e1e0d9';
const AXIS = '#c3c2b7';
const GREEN = '#0ca30c';
const RED = '#d03b3b';

function Empty() {
  return <div className="flex h-full w-full items-center justify-center text-sm text-muted">暂无数据</div>;
}

function TipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-ink px-3 py-2.5 text-xs text-surface shadow-lg">{children}</div>
  );
}

function LineTip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <TipShell>
      <div className="mb-1 text-surface/70">{shortMonthLabel(String(label))}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey}>
          {p.name} {fmtYuan(Number(p.value))}
        </div>
      ))}
    </TipShell>
  );
}

function BarTip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  return (
    <TipShell>
      {p.payload.name} {fmtYuan(Number(p.value))}
    </TipShell>
  );
}

function SavingsTip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <TipShell>
      <div className="mb-1 text-surface/70">{shortMonthLabel(String(label))}</div>
      <div>结余 {fmtYuan(Number(payload[0].value))}</div>
    </TipShell>
  );
}

export function TrendChart({ data }: { data: MonthlyReport[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={shortMonthLabel}
          tick={{ fontSize: 11, fill: INK }}
          axisLine={{ stroke: AXIS }}
          tickLine={false}
          minTickGap={8}
        />
        <YAxis
          tickFormatter={(v) => fmtWan(Number(v))}
          tick={{ fontSize: 11, fill: INK }}
          axisLine={false}
          tickLine={false}
          width={48}
          domain={[0, 'auto']}
        />
        <Tooltip content={<LineTip />} cursor={{ stroke: AXIS, strokeDasharray: '3 3' }} />
        <Line
          type="monotone"
          dataKey="income"
          name="收入"
          stroke={GREEN}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="expense"
          name="支出"
          stroke={RED}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({ data }: { data: CategoryBreakdown[] }) {
  if (data.length === 0) return <Empty />;
  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => fmtWan(Number(v))}
          tick={{ fontSize: 11, fill: INK }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={44}
          tick={{ fontSize: 12, fill: INK2 }}
          axisLine={{ stroke: AXIS }}
          tickLine={false}
        />
        <Tooltip content={<BarTip />} cursor={{ fill: 'rgba(11,11,11,0.03)' }} />
        <Bar dataKey="amount" barSize={16} radius={4}>
          {sorted.map((d) => (
            <Cell key={d.category_id} fill={categoryColor(d.name)} />
          ))}
          <LabelList
            dataKey="amount"
            position="right"
            formatter={(v: any) => fmtYuan(Number(v))}
            style={{ fill: INK2, fontSize: 11, fontWeight: 500 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SavingsBarChart({ data }: { data: MonthlyReport[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={shortMonthLabel}
          tick={{ fontSize: 11, fill: INK }}
          axisLine={{ stroke: AXIS }}
          tickLine={false}
          minTickGap={8}
        />
        <YAxis
          tickFormatter={(v) => fmtWan(Number(v))}
          tick={{ fontSize: 11, fill: INK }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<SavingsTip />} cursor={{ fill: 'rgba(11,11,11,0.03)' }} />
        <Bar dataKey="balance" name="结余" fill={GREEN} barSize={14} radius={4} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface DonutDatum {
  name: string;
  amount: number;
}

function DonutTip({ active, payload, total }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  const pct = total > 0 ? Math.round((Number(p.value) / total) * 100) : 0;
  return (
    <TipShell>
      {p.name} {fmtYuan(Number(p.value))}（{pct}%）
    </TipShell>
  );
}

export function CompositionDonut({ data }: { data: DonutDatum[] }) {
  const total = data.reduce((a, b) => a + b.amount, 0);
  if (data.length === 0) return <Empty />;
  return (
    <div className="flex h-full items-center gap-3">
      <div className="relative h-full min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<DonutTip total={total} />} />
            <Pie
              data={data}
              dataKey="amount"
              nameKey="name"
              innerRadius="62%"
              outerRadius="100%"
              stroke="#fcfcfb"
              strokeWidth={2}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={categoryColor(d.name)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[11px] text-ink2">全年支出</div>
          <div className="text-[17px] font-semibold text-ink">{fmtWan(total)}</div>
        </div>
      </div>
      <ul className="w-36 shrink-0 space-y-1.5 text-xs">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: categoryColor(d.name) }}
            />
            <span className="min-w-0 flex-1 truncate text-ink2">{d.name}</span>
            <span className="text-right">
              <span className="block num leading-tight text-ink2">{fmtYuan(d.amount)}</span>
              <span className="block num leading-tight text-muted">
                {total > 0 ? Math.round((d.amount / total) * 100) : 0}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
