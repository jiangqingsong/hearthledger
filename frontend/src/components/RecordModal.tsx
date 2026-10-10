import { useEffect, useMemo, useRef, useState } from 'react';
import { DeleteButton } from '@/components/DeleteButton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { categoryMeta, OWNER_LABELS } from '@/lib/category-meta';
import { useApp } from '@/lib/context';
import { todayString } from '@/lib/format';
import type { Direction, Owner, Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Transaction | null;
}

export function RecordModal({ open, onOpenChange, editing }: Props) {
  const { categories, templates, bump, toast } = useApp();
  const [dir, setDir] = useState<Direction>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [owner, setOwner] = useState<Owner>('me');
  const [date, setDate] = useState(todayString());
  const [note, setNote] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);

  const cats = useMemo(() => categories.filter((c) => c.direction === dir), [categories, dir]);

  // Initialize/reset the form when the modal opens.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDir(editing.direction);
      setAmount(String(editing.amount));
      setCategoryId(editing.category_id);
      setOwner(editing.owner);
      setDate(editing.date);
      setNote(editing.note ?? '');
    } else {
      setDir('expense');
      setAmount('');
      setOwner('me');
      setDate(todayString());
      setNote('');
      const first = categories.find((c) => c.direction === 'expense');
      setCategoryId(first ? first.id : null);
    }
    const t = setTimeout(() => amountRef.current?.focus(), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  // Keep a valid category selected when direction changes or categories load.
  useEffect(() => {
    if (!open) return;
    if (cats.length === 0) return;
    if (!cats.some((c) => c.id === categoryId)) {
      setCategoryId(cats[0].id);
    }
  }, [open, cats, categoryId]);

  const save = () => {
    const n = Number(amount);
    if (!amount || !Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      toast('请填写正整数金额');
      amountRef.current?.focus();
      return;
    }
    if (categoryId == null) {
      toast('请选择类别');
      return;
    }
    const body = {
      date,
      direction: dir,
      amount: n,
      category_id: categoryId,
      owner,
      note: note.trim() ? note.trim() : null,
    };
    (editing ? api.updateTransaction(editing.id, body) : api.createTransaction(body))
      .then(() => {
        bump();
        toast(`已保存：${dir === 'expense' ? '-' : '+'} ¥${n.toLocaleString('zh-CN')}`);
        onOpenChange(false);
      })
      .catch((e) => toast(e instanceof Error ? e.message : '保存失败'));
  };

  const del = () => {
    if (!editing) return;
    api
      .deleteTransaction(editing.id)
      .then(() => {
        bump();
        toast('已删除');
        onOpenChange(false);
      })
      .catch((e) => toast(e instanceof Error ? e.message : '删除失败'));
  };

  const applyTemplate = (dir: Direction, catId: number, amt: number, own: Owner) => {
    setDir(dir);
    setOwner(own);
    setCategoryId(catId);
    setAmount(String(amt));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-lg flex-col gap-0 overflow-y-auto rounded-2xl border-0 bg-surface p-0 shadow-xl">
        <div className="flex items-center justify-between px-6 pb-3 pt-5">
          <div className="text-lg font-semibold">记一笔</div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="-m-2 rounded-lg p-2 text-muted hover:text-ink"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form
          className="space-y-5 px-6 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {/* direction toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-page p-1">
            {(['expense', 'income'] as Direction[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDir(d)}
                className={cn(
                  'rounded-lg py-2 text-sm font-medium',
                  dir === d ? 'bg-surface shadow-sm text-ink' : 'text-ink2',
                )}
              >
                {d === 'expense' ? '支出' : '收入'}
              </button>
            ))}
          </div>

          {/* amount */}
          <div>
            <div className="mb-1.5 text-xs text-ink2">金额（元）</div>
            <div className="flex items-center rounded-xl border border-line px-4 py-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <span className="mr-2 text-xl text-muted">¥</span>
              <input
                ref={amountRef}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="0"
                className={cn(
                  'num w-full bg-transparent text-2xl font-semibold outline-none',
                  dir === 'income' ? 'text-goodText' : 'text-bad',
                )}
              />
            </div>
          </div>

          {/* templates */}
          {templates.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs text-ink2">常用项（点一下自动填）</div>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t.direction, t.category_id, t.amount, t.owner)}
                    className="rounded-lg bg-black/[.04] px-3 py-2 text-sm hover:bg-black/[.07]"
                  >
                    {t.name} {t.direction === 'income' ? '+' : '-'}
                    {t.amount.toLocaleString('zh-CN')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* category grid */}
          <div>
            <div className="mb-1.5 text-xs text-ink2">类别</div>
            {cats.length === 0 ? (
              <div className="rounded-lg border border-line py-6 text-center text-xs text-muted">
                暂无{dir === 'expense' ? '支出' : '收入'}分类
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {cats.map((c) => {
                  const meta = categoryMeta(c.name, dir);
                  const active = c.id === categoryId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs',
                        active
                          ? 'border-brand bg-brand-50 text-brand'
                          : 'border-line hover:border-brand hover:bg-brand-50',
                      )}
                    >
                      <span className="text-xl">{meta.icon}</span>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* owner + date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1.5 text-xs text-ink2">归属</div>
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-page p-1">
                {(['me', 'spouse', 'shared'] as Owner[]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOwner(o)}
                    className={cn(
                      'rounded-md py-1.5 text-xs font-medium',
                      owner === o ? 'bg-surface shadow-sm text-ink' : 'text-ink2',
                    )}
                  >
                    {OWNER_LABELS[o]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-ink2">日期</div>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-auto rounded-lg border-line bg-surface px-3 py-1.5 text-sm shadow-none"
              />
            </div>
          </div>

          {/* note */}
          <div>
            <div className="mb-1.5 text-xs text-ink2">备注（可选）</div>
            <Input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="写点备注…"
              className="h-auto rounded-lg border-line px-3 py-2 text-sm shadow-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            {editing && <DeleteButton label="删除" onConfirm={del} className="px-3 py-2" />}
            <div className="flex flex-1 gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
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
