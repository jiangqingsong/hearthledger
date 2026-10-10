import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  onConfirm: () => void;
  label?: string;
  className?: string;
}

/** Two-step delete button: first click arms, second click confirms. */
export function DeleteButton({ onConfirm, label = '删除', className }: Props) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  if (!armed) {
    return (
      <button
        type="button"
        className={cn('px-2 py-1 text-xs text-muted hover:text-bad', className)}
        onClick={() => setArmed(true)}
      >
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={cn('px-2 py-1 text-xs font-medium text-bad hover:text-bad/80', className)}
      onClick={() => {
        setArmed(false);
        onConfirm();
      }}
    >
      确认{label}?
    </button>
  );
}
