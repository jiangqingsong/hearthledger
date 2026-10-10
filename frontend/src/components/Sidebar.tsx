import { useApp, type ViewKey } from '@/lib/context';
import { cn } from '@/lib/utils';

function DashboardIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 21h18M7 16v-4M12 16V7M17 16v-7" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 13 13 20l-8 1 1-8 7-7a2 2 0 0 1 2.8 0l4.2 4.2a2 2 0 0 1 0 2.8z" />
      <path d="M14.5 7.5l2 2" />
    </svg>
  );
}

const NAV: { key: ViewKey; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: '仪表盘', icon: <DashboardIcon /> },
  { key: 'transactions', label: '流水', icon: <ListIcon /> },
  { key: 'reports', label: '报表', icon: <ChartIcon /> },
  { key: 'balance', label: '资产负债', icon: <WalletIcon /> },
  { key: 'categories', label: '分类管理', icon: <TagIcon /> },
];

export function Sidebar({ onBackup }: { onBackup: () => void }) {
  const { view, setView } = useApp();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white">
          H
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold">HearthLedger</div>
          <div className="text-[11px] text-muted">家庭账本</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((n) => (
          <button
            key={n.key}
            type="button"
            onClick={() => setView(n.key)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
              view === n.key ? 'bg-brand/10 text-brand' : 'text-ink2 hover:bg-black/[.04]',
            )}
          >
            {n.icon}
            {n.label}
          </button>
        ))}
      </nav>

      <div className="space-y-3 border-t border-line px-4 py-4">
        <button
          type="button"
          onClick={onBackup}
          className="flex items-center gap-2 text-xs text-muted hover:text-ink"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
          </svg>
          导出备份
        </button>
        <div className="flex -space-x-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-medium text-white ring-2 ring-surface">
            我
          </div>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#eb6834] text-xs font-medium text-white ring-2 ring-surface">
            媳
          </div>
        </div>
      </div>
    </aside>
  );
}
