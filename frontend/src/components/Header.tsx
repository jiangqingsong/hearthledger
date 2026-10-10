import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/context';
import { monthLabel } from '@/lib/format';

export function Header({ title, onAdd }: { title: string; onAdd: () => void }) {
  const { currentMonth, username, logout } = useApp();
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="hidden items-center gap-2 md:flex">
          <span className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] text-ink2">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {monthLabel(currentMonth)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {username && (
          <span className="hidden items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] text-ink2 sm:flex">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
            {username}
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => void logout()}
          className="h-auto rounded-lg border-line bg-surface px-3 py-2 text-sm font-medium text-ink2 hover:bg-black/[.03]"
        >
          退出登录
        </Button>
        <Button
          type="button"
          onClick={onAdd}
          className="h-auto rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          记一笔
        </Button>
      </div>
    </header>
  );
}
