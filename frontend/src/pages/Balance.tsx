import { useEffect, useState } from 'react';
import { DeleteButton } from '@/components/DeleteButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { OWNER_LABELS, SUBTYPE_ICONS, SUBTYPE_LABELS } from '@/lib/category-meta';
import { useApp } from '@/lib/context';
import { fmtAmount, fmtYuan } from '@/lib/format';
import type { BalanceItem, BalanceSummary, Kind, Owner, Subtype } from '@/lib/types';
import { cn } from '@/lib/utils';

const ASSET_SUBTYPES: Subtype[] = ['deposit', 'cash', 'property', 'car'];
const LIABILITY_SUBTYPES: Subtype[] = ['mortgage', 'credit_card', 'car_loan', 'consumer_loan'];

function isLiquid(item: BalanceItem): boolean {
  return item.kind === 'asset' && (item.subtype === 'deposit' || item.subtype === 'cash');
}

function valueTone(item: BalanceItem): 'good' | 'bad' | 'neutral' {
  if (item.kind === 'liability') return 'bad';
  if (isLiquid(item)) return 'good';
  return 'neutral';
}

interface DialogState {
  open: boolean;
  editing: BalanceItem | null;
  kind: Kind;
}

function BalanceItemDialog({
  state,
  onClose,
}: {
  state: DialogState;
  onClose: () => void;
}) {
  const { bump, toast } = useApp();
  const editing = state.editing;
  const [name, setName] = useState('');
  const [subtype, setSubtype] = useState<Subtype>('deposit');
  const [owner, setOwner] = useState<Owner>('me');
  const [currentValue, setCurrentValue] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!state.open) return;
    if (editing) {
      setName(editing.name);
      setSubtype(editing.subtype);
      setOwner(editing.owner);
      setCurrentValue(String(editing.current_value));
      setNote(editing.note ?? '');
    } else {
      setName('');
      setSubtype(state.kind === 'asset' ? 'deposit' : 'mortgage');
      setOwner('me');
      setCurrentValue('');
      setNote('');
    }
  }, [state.open, editing, state.kind]);

  const subtypes = state.kind === 'asset' ? ASSET_SUBTYPES : LIABILITY_SUBTYPES;

  const save = () => {
    const n = Number(currentValue);
    if (!name.trim()) {
      toast('请填写名称');
      return;
    }
    if (!currentValue || !Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      toast('请填写非负整数金额');
      return;
    }
    const body = {
      name: name.trim(),
      kind: state.kind,
      subtype,
      owner,
      current_value: n,
      note: note.trim() ? note.trim() : null,
    };
    (editing ? api.updateBalanceItem(editing.id, body) : api.createBalanceItem(body))
      .then(() => {
        bump();
        toast('已保存');
        onClose();
      })
      .catch((e) => toast(e instanceof Error ? e.message : '保存失败'));
  };

  const del = () => {
    if (!editing) return;
    api
      .deleteBalanceItem(editing.id)
      .then(() => {
        bump();
        toast('已删除');
        onClose();
      })
      .catch((e) => toast(e instanceof Error ? e.message : '删除失败'));
  };

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex w-full max-w-md flex-col gap-0 rounded-2xl border-0 bg-surface p-0 shadow-xl">
        <div className="flex items-center justify-between px-6 pb-3 pt-5">
          <DialogTitle className="text-lg font-semibold">
            {editing ? '编辑' : state.kind === 'asset' ? '添加资产' : '添加负债'}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="-m-2 rounded-lg p-2 text-muted hover:text-ink"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form
          className="space-y-4 px-6 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-xs text-ink2">名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：自住房产"
              className="h-auto rounded-lg border-line bg-surface px-3 py-2 text-sm shadow-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-ink2">类型</Label>
              <Select value={subtype} onValueChange={(v) => setSubtype(v as Subtype)}>
                <SelectTrigger className="h-auto rounded-lg border-line bg-surface px-3 py-2 text-sm shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subtypes.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SUBTYPE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-ink2">归属</Label>
              <Select value={owner} onValueChange={(v) => setOwner(v as Owner)}>
                <SelectTrigger className="h-auto rounded-lg border-line bg-surface px-3 py-2 text-sm shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(OWNER_LABELS) as Owner[]).map((o) => (
                    <SelectItem key={o} value={o}>
                      {OWNER_LABELS[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-ink2">当前估值（元）</Label>
            <Input
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="0"
              className="num h-auto rounded-lg border-line bg-surface px-3 py-2 text-sm shadow-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-ink2">备注（可选）</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="写点备注…"
              className="h-auto rounded-lg border-line bg-surface px-3 py-2 text-sm shadow-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            {editing && <DeleteButton label="删除" onConfirm={del} className="px-3 py-2" />}
            <div className="flex flex-1 gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="h-auto flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink2 hover:bg-black/[.03]"
              >
                取消
              </Button>
              <Button
                type="submit"
                className="h-auto flex-1 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-600"
              >
                保存
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Balance() {
  const { version, toast } = useApp();
  const [items, setItems] = useState<BalanceItem[]>([]);
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    editing: null,
    kind: 'asset',
  });

  useEffect(() => {
    Promise.all([api.listBalanceItems(), api.getBalanceSummary()])
      .then(([it, s]) => {
        setItems(it);
        setSummary(s);
      })
      .catch((e) => toast(e instanceof Error ? e.message : '加载资产负债失败'));
  }, [version, toast]);

  const assets = items.filter((i) => i.kind === 'asset');
  const liabilities = items.filter((i) => i.kind === 'liability');

  const debtRatio =
    summary && summary.total_assets > 0
      ? `${((summary.total_liabilities / summary.total_assets) * 100).toFixed(1)}%`
      : '—';

  const renderItem = (item: BalanceItem) => {
    const tone = valueTone(item);
    return (
      <div
        key={item.id}
        className="flex items-center justify-between rounded-xl border border-line px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-black/[.04] text-base">
            {SUBTYPE_ICONS[item.subtype]}
          </span>
          <div>
            <div className="text-sm font-medium">{item.name}</div>
            <div className="text-xs text-muted">
              {SUBTYPE_LABELS[item.subtype]} · {OWNER_LABELS[item.owner]}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'num text-sm font-semibold',
              tone === 'good' ? 'text-goodText' : tone === 'bad' ? 'text-bad' : 'text-ink',
            )}
          >
            {fmtAmount(item.current_value)}
          </span>
          <button
            type="button"
            onClick={() => setDialog({ open: true, editing: item, kind: item.kind })}
            className="px-2 py-1 text-xs text-muted hover:text-ink"
          >
            编辑
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <Card className="border-brand/20 bg-gradient-to-br from-brand-50 to-surface p-6">
        <div className="text-sm text-ink2">净资产</div>
        <div className="mt-1 flex items-end gap-2">
          <span className="num text-[40px] font-semibold leading-none text-ink">
            {fmtAmount(summary?.net_worth ?? 0)}
          </span>
          <span className="num mb-1 text-sm text-muted">
            {fmtYuan(summary?.net_worth ?? 0)}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-muted">总资产</span>{' '}
            <span className="num font-semibold">{fmtAmount(summary?.total_assets ?? 0)}</span>
          </div>
          <div>
            <span className="text-muted">流动资产</span>{' '}
            <span className="num font-semibold text-goodText">
              {fmtAmount(summary?.liquid_assets ?? 0)}
            </span>
          </div>
          <div>
            <span className="text-muted">总负债</span>{' '}
            <span className="num font-semibold text-bad">
              {fmtAmount(summary?.total_liabilities ?? 0)}
            </span>
          </div>
          <div>
            <span className="text-muted">资产负债率</span>{' '}
            <span className="num font-semibold">{debtRatio}</span>{' '}
            <span className="text-xs text-muted">（负债占总资产比重）</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[15px] font-medium">资产</div>
            <button
              type="button"
              onClick={() => setDialog({ open: true, editing: null, kind: 'asset' })}
              className="-mx-2 -my-1 px-2 py-1 text-xs font-medium text-brand"
            >
              ＋ 添加资产
            </button>
          </div>
          <div className="space-y-3">
            {assets.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted">暂无资产</div>
            ) : (
              assets.map(renderItem)
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[15px] font-medium">负债</div>
            <button
              type="button"
              onClick={() => setDialog({ open: true, editing: null, kind: 'liability' })}
              className="-mx-2 -my-1 px-2 py-1 text-xs font-medium text-brand"
            >
              ＋ 添加负债
            </button>
          </div>
          <div className="space-y-3">
            {liabilities.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted">暂无负债</div>
            ) : (
              liabilities.map(renderItem)
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="text-sm text-muted">
          💡 每月底回来更新一次余额即可，净资产会自动重算。这里不用精确到分，记个大概就好。
        </div>
      </Card>

      <BalanceItemDialog state={dialog} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
    </div>
  );
}
