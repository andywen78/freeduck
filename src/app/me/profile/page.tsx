'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loading, NeedsSetup } from '@/components/NeedsSetup';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUser } from '@/lib/useUser';
import { CITIES, districtsOf } from '@/lib/taiwan';

export default function ProfilePage() {
  const { userId, loading, unconfigured } = useUser();

  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    city: '',
    district: '',
    phone: '',
    line_id: '',
  });
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const districts = useMemo(() => districtsOf(form.city), [form.city]);

  const load = useCallback(async () => {
    if (!userId) return;
    const sb = supabaseBrowser();
    const [p, c] = await Promise.all([
      sb.from('profiles').select('display_name, bio, city, district').eq('id', userId).maybeSingle(),
      sb.from('contacts').select('phone, line_id').eq('user_id', userId).maybeSingle(),
    ]);
    setForm({
      display_name: p.data?.display_name ?? '',
      bio: p.data?.bio ?? '',
      city: p.data?.city ?? '',
      district: p.data?.district ?? '',
      phone: c.data?.phone ?? '',
      line_id: c.data?.line_id ?? '',
    });
    setFetching(false);
  }, [userId]);

  useEffect(() => {
    if (userId) load();
    else if (!loading) setFetching(false);
  }, [userId, loading, load]);

  function set(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v, ...(k === 'city' ? { district: '' } : null) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setBusy(true);
    setMsg(null);
    const sb = supabaseBrowser();

    const [p, c] = await Promise.all([
      sb
        .from('profiles')
        .update({
          display_name: form.display_name.trim(),
          bio: form.bio.trim() || null,
          city: form.city || null,
          district: form.district || null,
        })
        .eq('id', userId),
      sb.from('contacts').upsert({
        user_id: userId,
        phone: form.phone.trim() || null,
        line_id: form.line_id.trim() || null,
      }),
    ]);

    setBusy(false);
    setMsg(p.error || c.error ? `儲存失敗：${(p.error ?? c.error)!.message}` : '已儲存');
  }

  if (unconfigured) return <NeedsSetup />;
  if (loading || fetching) return <Loading rows={2} />;
  if (!userId)
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-soft">請先登入</p>
        <Link href="/login?next=/me/profile" className="btn-primary mt-4">
          去登入
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <Link href="/me" className="text-sm font-semibold text-ink-muted hover:text-brand-600">
          ← 我的頁面
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight">基本資料</h1>
      </header>

      <form onSubmit={save} className="card space-y-4 p-5">
        <div>
          <label className="label">顯示名稱</label>
          <input
            className="field"
            value={form.display_name}
            onChange={(e) => set('display_name', e.target.value)}
            maxLength={30}
            required
          />
        </div>

        <div>
          <label className="label">自我介紹</label>
          <textarea
            className="field resize-none"
            rows={3}
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
            placeholder="教育系大四，帶過三個國中生數學。也常幫鄰居遛狗。"
            maxLength={200}
          />
          <p className="mt-1 text-xs text-ink-muted">{form.bio.length}/200</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">縣市</label>
            <select className="field" value={form.city} onChange={(e) => set('city', e.target.value)}>
              <option value="">請選擇</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">行政區</label>
            <select
              className="field"
              value={form.district}
              onChange={(e) => set('district', e.target.value)}
              disabled={!districts.length}
            >
              <option value="">請選擇</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-cream p-4">
          <p className="text-sm font-bold">聯絡方式</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            🔒 兩道關卡：先要<span className="font-semibold text-ink">邀約被接受</span>，
            對方才有資格向你索取；再等你按下<span className="font-semibold text-ink">同意</span>，
            他才看得到。同意是單向的 —— 你想看對方的，要自己另外提出請求。
            不會出現在公開頁面或搜尋結果。
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">手機</label>
              <input
                className="field"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="0912345678"
                maxLength={20}
              />
            </div>
            <div>
              <label className="label">LINE ID</label>
              <input
                className="field"
                value={form.line_id}
                onChange={(e) => set('line_id', e.target.value)}
                placeholder="my_line_id"
                maxLength={40}
              />
            </div>
          </div>
        </div>

        {msg && <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800">{msg}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
          {busy ? '儲存中…' : '儲存'}
        </button>
      </form>
    </div>
  );
}
