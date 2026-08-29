'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Loading, NeedsSetup } from '@/components/NeedsSetup';
import { Tabs } from '@/components/Tabs';
import { CATEGORIES, CATEGORY_GROUPS, categoryOf } from '@/lib/categories';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUser } from '@/lib/useUser';
import { formatRate, type RateUnit, type Service } from '@/lib/types';

export default function ServicesPage() {
  const { userId, loading, unconfigured } = useUser();

  const [rows, setRows] = useState<Service[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<'on' | 'off'>('on');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState('tutor');
  const [title, setTitle] = useState('');
  const [rate, setRate] = useState('');
  const [unit, setUnit] = useState<RateUnit>('hourly');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setFetching(true);
    const { data } = await supabaseBrowser()
      .from('services')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setRows((data as Service[]) ?? []);
    setFetching(false);
  }, [userId]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (unit !== 'negotiable' && !rate) {
      setErr('請填薪資，或改選「面議」');
      return;
    }
    setBusy(true);
    setErr(null);

    const { error } = await supabaseBrowser().from('services').insert({
      user_id: userId,
      category_id: categoryId,
      title: title.trim() || null,
      rate: unit === 'negotiable' ? null : Number(rate),
      rate_unit: unit,
      note: note.trim() || null,
    });

    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setTitle('');
    setRate('');
    setNote('');
    load();
  }

  async function remove(id: string) {
    setRows((r) => r.filter((x) => x.id !== id));
    await supabaseBrowser().from('services').delete().eq('id', id);
  }

  async function toggleActive(s: Service) {
    setRows((r) => r.map((x) => (x.id === s.id ? { ...x, is_active: !x.is_active } : x)));
    await supabaseBrowser().from('services').update({ is_active: !s.is_active }).eq('id', s.id);
  }

  // 暫停中的項目不會出現在搜尋結果，跟接案中的分開列比較不會誤會
  const active = rows.filter((r) => r.is_active);
  const paused = rows.filter((r) => !r.is_active);
  const shown = tab === 'on' ? active : paused;

  if (unconfigured) return <NeedsSetup />;
  if (loading || (userId && fetching)) return <Loading />;
  if (!userId)
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-soft">請先登入</p>
        <Link href="/login?next=/me/services" className="btn-primary mt-4">
          去登入
        </Link>
      </div>
    );

  return (
    <div className="space-y-6">
      <header>
        <Link href="/me" className="text-sm font-semibold text-ink-muted hover:text-brand-600">
          ← 我的頁面
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight">我能做的事</h1>
        <p className="mt-1 text-sm text-ink-soft">
          想加幾項就加幾項，每項各自開價 ——
          <span className="font-semibold text-ink">家教 520、遛狗 220</span> 可以並存。
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <form onSubmit={add} className="card h-fit space-y-4 p-5">
          <div>
            <label className="label">分類</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="field"
            >
              {CATEGORY_GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {CATEGORIES.filter((c) => c.group === g).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="label">補充標題（選填）</label>
            <input
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="國中數學家教"
              maxLength={40}
            />
          </div>

          <div>
            <label className="label">薪資</label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="field"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={unit === 'daily' ? '1800' : '250'}
                disabled={unit === 'negotiable'}
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as RateUnit)}
                className="field !w-28"
              >
                <option value="hourly">／小時</option>
                <option value="daily">／日</option>
                <option value="negotiable">面議</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">備註（選填）</label>
            <textarea
              className="field resize-none"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="自備清潔用品／需含交通費"
              maxLength={120}
            />
          </div>

          {err && <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800">{err}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
            {busy ? '新增中…' : '新增這項服務'}
          </button>
        </form>

        <section className="space-y-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'on', label: '接案中', count: active.length },
              { key: 'off', label: '已暫停', count: paused.length },
            ]}
          />

          {shown.length === 0 ? (
            <div className="card px-6 py-10 text-center text-sm text-ink-soft">
              {rows.length === 0
                ? '還沒有服務項目。左邊加第一項吧 🦆'
                : tab === 'on'
                  ? '目前沒有接案中的服務。暫停中的項目不會出現在搜尋結果裡。'
                  : '沒有暫停中的項目。'}
            </div>
          ) : (
            shown.map((s, i) => {
              const c = categoryOf(s.category_id);
              return (
                <div
                  key={s.id}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  className={`card animate-rise flex items-start gap-3 p-4 ${
                    s.is_active ? '' : 'opacity-55'
                  }`}
                >
                  <span className="text-2xl">{c?.emoji ?? '•'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {c?.name ?? '其他'}
                      {s.title && (
                        <span className="ml-2 text-sm font-normal text-ink-soft">{s.title}</span>
                      )}
                    </p>
                    {s.note && <p className="mt-1 text-xs text-ink-muted">{s.note}</p>}
                    <div className="mt-2 flex gap-3 text-xs font-semibold">
                      <button
                        onClick={() => toggleActive(s)}
                        className="text-ink-muted hover:text-brand-600"
                      >
                        {s.is_active ? '暫停接案' : '恢復接案'}
                      </button>
                      <button
                        onClick={() => remove(s.id)}
                        className="text-ink-muted hover:text-brand-600"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                  <span className="shrink-0 text-lg font-black text-brand-600">
                    {formatRate(s.rate, s.rate_unit)}
                  </span>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
