import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { categoryMeta, OWNER_LABELS } from '@/lib/category-meta';
import { fmtSigned } from '@/lib/format';
import type { Category, Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  txs: Transaction[];
  categories: Category[];
  showActions?: boolean;
  onEdit?: (tx: Transaction) => void;
}

export function TransactionTable({ txs, categories, showActions = false, onEdit }: Props) {
  const map = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  if (txs.length === 0) {
    return <div className="py-8 text-center text-sm text-muted">暂无流水</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs text-muted">
          <TableHead className="px-5 py-2.5 font-medium">日期</TableHead>
          <TableHead className="px-5 py-2.5 font-medium">类别</TableHead>
          <TableHead className="px-5 py-2.5 font-medium">归属</TableHead>
          <TableHead className="px-5 py-2.5 font-medium">备注</TableHead>
          <TableHead className="px-5 py-2.5 text-right font-medium">金额</TableHead>
          {showActions && (
            <TableHead className="px-5 py-2.5 text-right font-medium">操作</TableHead>
          )}
        </tr>
      </thead>
      <TableBody className="divide-y divide-line">
        {txs.map((tx) => {
          const cat = map.get(tx.category_id);
          const meta = categoryMeta(cat?.name ?? '', tx.direction);
          const signed = tx.direction === 'income' ? tx.amount : -tx.amount;
          return (
            <TableRow key={tx.id}>
              <TableCell className="num px-5 py-2.5 text-ink2">{tx.date.slice(5)}</TableCell>
              <TableCell className="px-5 py-2.5">
                {meta.icon} {cat?.name ?? `#${tx.category_id}`}
              </TableCell>
              <TableCell className="px-5 py-2.5">
                <Badge
                  variant="outline"
                  className="rounded-full border-transparent bg-black/[.05] px-2 py-0.5 text-xs font-normal text-ink2"
                >
                  {OWNER_LABELS[tx.owner]}
                </Badge>
              </TableCell>
              <TableCell className="px-5 py-2.5 text-muted">{tx.note ?? ''}</TableCell>
              <TableCell
                className={cn(
                  'num px-5 py-2.5 text-right font-medium',
                  tx.direction === 'income' ? 'text-goodText' : 'text-bad',
                )}
              >
                {fmtSigned(signed)}
              </TableCell>
              {showActions && (
                <TableCell className="px-5 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit?.(tx)}
                    className="px-2 py-1 text-xs text-muted hover:text-ink"
                  >
                    编辑
                  </button>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </table>
  );
}
