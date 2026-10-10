import { useEffect, useState } from 'react';
import { DeleteButton } from '@/components/DeleteButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { categoryMeta } from '@/lib/category-meta';
import { useApp } from '@/lib/context';
import type { Category, Direction } from '@/lib/types';

interface DialogState {
  open: boolean;
  editing: Category | null;
  direction: Direction;
}

function CategoryDialog({ state, onClose }: { state: DialogState; onClose: () => void }) {
  const { bump, toast } = useApp();
  const editing = state.editing;
  const [name, setName] = useState('');
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (!state.open) return;
    if (editing) {
      setName(editing.name);
      setHint(editing.hint ?? '');
    } else {
      setName('');
      setHint('');
    }
  }, [state.open, editing]);

  const save = () => {
    if (!name.trim()) {
      toast('请填写分类名称');
      return;
    }
    const body = {
      name: name.trim(),
      direction: state.direction,
      hint: hint.trim() ? hint.trim() : null,
    };
    (editing ? api.updateCategory(editing.id, body) : api.createCategory(body))
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
      .deleteCategory(editing.id)
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
            {editing ? '编辑分类' : '新建分类'}
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
            <Label className="text-xs text-ink2">
              名称（{state.direction === 'expense' ? '支出' : '收入'}分类）
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：吃喝"
              className="h-auto rounded-lg border-line bg-surface px-3 py-2 text-sm shadow-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-ink2">说明（可选）</Label>
            <Input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="如：买菜 / 外出吃"
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

export default function Categories() {
  const { categories, bump, toast } = useApp();
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    editing: null,
    direction: 'expense',
  });

  const expCats = categories.filter((c) => c.direction === 'expense');
  const incCats = categories.filter((c) => c.direction === 'income');

  const remove = (c: Category) => {
    api
      .deleteCategory(c.id)
      .then(() => {
        bump();
        toast('已删除');
      })
      .catch((e) => toast(e instanceof Error ? e.message : '删除失败'));
  };

  const renderRow = (c: Category) => {
    const meta = categoryMeta(c.name, c.direction);
    return (
      <div
        key={c.id}
        className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-black/[.02]"
      >
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
          {meta.icon} {c.name}
        </span>
        <span className="flex items-center gap-1">
          {c.hint && <span className="text-xs text-muted">· {c.hint}</span>}
          <span className="hidden items-center group-hover:flex">
            <button
              type="button"
              onClick={() => setDialog({ open: true, editing: c, direction: c.direction })}
              className="px-2 py-1 text-xs text-muted hover:text-ink"
            >
              编辑
            </button>
            <DeleteButton label="删除" onConfirm={() => remove(c)} />
          </span>
        </span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[15px] font-medium">支出分类</div>
          <button
            type="button"
            onClick={() => setDialog({ open: true, editing: null, direction: 'expense' })}
            className="-mx-2 -my-1 px-2 py-1 text-xs font-medium text-brand"
          >
            ＋ 新建
          </button>
        </div>
        <div className="space-y-1.5">
          {expCats.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted">暂无支出分类</div>
          ) : (
            expCats.map(renderRow)
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[15px] font-medium">收入分类</div>
          <button
            type="button"
            onClick={() => setDialog({ open: true, editing: null, direction: 'income' })}
            className="-mx-2 -my-1 px-2 py-1 text-xs font-medium text-brand"
          >
            ＋ 新建
          </button>
        </div>
        <div className="space-y-1.5">
          {incCats.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted">暂无收入分类</div>
          ) : (
            incCats.map(renderRow)
          )}
        </div>
      </Card>

      <CategoryDialog state={dialog} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
    </div>
  );
}
