import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/lib/context';

export default function Login() {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-lg font-semibold text-white shadow-sm">
            H
          </div>
          <div className="text-center leading-tight">
            <div className="text-lg font-semibold text-ink">HearthLedger</div>
            <div className="text-sm text-muted">家庭账本</div>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-ink2">
                用户名
              </Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="h-auto rounded-lg border-line bg-surface px-3 py-2.5 text-sm shadow-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-ink2">
                密码
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-auto rounded-lg border-line bg-surface px-3 py-2.5 text-sm shadow-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-bad/10 px-3 py-2 text-[13px] text-bad">{error}</div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-auto w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              {loading ? '登录中…' : '登录'}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-xs text-muted">
          本地开发默认账号：admin / hearthledger（部署前请修改）
        </p>
      </div>
    </div>
  );
}
