'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_GROUPS } from '@/lib/categories';
import { supabaseBrowser } from '@/lib/supabase/client';
import { CITIES, districtsOf } from '@/lib/taiwan';
import { toISODate, type Job, type RateUnit } from '@/lib/types';

export type JobDraft = {
  title: string;
  category_id: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  city: string;
  district: string;
  address_note: string;
  rate: string;
  rate_unit: RateUnit;
  headcount: number;
};

export function draftFromJob(j: Job): JobDraft {
  return {
    title: j.title,
    category_id: j.category_id,
    description: j.description ?? '',
    date: j.date,
    start_time: j.start_time.slice(0, 5),
    end_time: j.end_time.slice(0, 5),
    city: j.city,
    district: j.district,
    address_note: j.address_note ?? '',
    rate: j.rate == null ? '' : String(j.rate),
    rate_unit: j.rate_unit,
    headcount: j.headcount,
  };
}

const EMPTY: JobDraft = {
  title: '',
  category_id: 'stall',
  description: '',
  date: toISODate(new Date()),
  start_time: '18:00',
  end_time: '22:00',
  city: '',
  district: '',
  address_note: '',
  rate: '',
  rate_unit: 'hourly',
  headcount: 1,
};

/** 新增與編輯共用同一份表單，避免兩邊規則長歪。 */
export function JobForm({
  userId,
  jobId,
  initial,
}: {
  userId: string;
  /** 有帶就是編輯模式 */
  jobId?: string;
  initial?: JobDraft;
}) {
  const router = useRouter();
  const [f, setF] = useState<JobDraft>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const districts = useMemo(() => districtsOf(f.city), [f.city]);
  const editing = !!jobId;

  function set<K extends keyof JobDraft>(k: K, v: JobDraft[K]) {
    setF((p) => ({ ...p, [k]: v, ...(k === 'city' ? { district: '' } : null) }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.end_time <= f.start_time) return setErr('結束時間要比開始時間晚');
    if (!f.city || !f.district) return setErr('請選擇縣市與行政區');
    if (f.rate_unit !== 'negotiable' && !f.rate) return setErr('請填薪資，或改選「面議」');

    setBusy(true);
    setErr(null);

    const payload = {
      category_id: f.category_id,
      title: f.title.trim(),
      description: f.description.trim() || null,
      date: f.date,
      start_time: f.start_time,
      end_time: f.end_time,
      city: f.city,
      district: f.district,
      address_note: f.address_note.trim() || null,
      rate: f.rate_unit === 'negotiable' ? null : Number(f.rate),
      rate_unit: f.rate_unit,
      headcount: Number(f.headcount) || 1,
    };

    const sb = supabaseBrowser();
    const { data, error } = editing
      ? await sb.from('jobs').update(payload).eq('id', jobId).select('id').single()
      : await sb
          .from('jobs')
          .insert({ ...payload, employer_id: userId })
          .select('id')
          .single();

    setBusy(false);
    if (error) return setErr(`${editing ? '儲存' : '發布'}失敗：${error.message}`);
    router.push(`/jobs/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div>
        <label className="label">標題</label>
        <input
          className="field"
          value={f.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="夜市顧攤＋出餐幫手"
          maxLength={40}
          required
        />
      </div>

      <div>
        <label className="label">分類</label>
        <select
          className="field"
          value={f.category_id}
          onChange={(e) => set('category_id', e.target.value)}
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

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">日期</label>
          <input
            type="date"
            className="field"
            value={f.date}
            min={toISODate(new Date())}
            onChange={(e) => set('date', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">開始</label>
          <input
            type="time"
            step={900}
            className="field"
            value={f.start_time}
            onChange={(e) => set('start_time', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">結束</label>
          <input
            type="time"
            step={900}
            className="field"
            value={f.end_time}
            onChange={(e) => set('end_time', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">縣市</label>
          <select className="field" value={f.city} onChange={(e) => set('city', e.target.value)} required>
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
            value={f.district}
            onChange={(e) => set('district', e.target.value)}
            disabled={!districts.length}
            required
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

      <div>
        <label className="label">地點補充（選填）</label>
        <input
          className="field"
          value={f.address_note}
          onChange={(e) => set('address_note', e.target.value)}
          placeholder="寧夏路夜市中段 / 近捷運行天宮站"
          maxLength={60}
        />
        <p className="mt-1 text-xs text-ink-muted">
          建議先不要寫完整住址，媒合成立後再私訊給對方。
        </p>
      </div>

      <div className="grid grid-cols-[1fr_7rem_5.5rem] gap-3">
        <div>
          <label className="label">薪資</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className="field"
            value={f.rate}
            onChange={(e) => set('rate', e.target.value)}
            placeholder="220"
            disabled={f.rate_unit === 'negotiable'}
          />
        </div>
        <div>
          <label className="label">單位</label>
          <select
            className="field"
            value={f.rate_unit}
            onChange={(e) => set('rate_unit', e.target.value as RateUnit)}
          >
            <option value="hourly">／小時</option>
            <option value="daily">／日</option>
            <option value="negotiable">面議</option>
          </select>
        </div>
        <div>
          <label className="label">徵幾人</label>
          <input
            type="number"
            min={1}
            max={99}
            className="field"
            value={f.headcount}
            onChange={(e) => set('headcount', Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <label className="label">工作內容</label>
        <textarea
          rows={4}
          className="field resize-none"
          value={f.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="週五週六人潮多，需要一個人幫忙裝袋、結帳。不用經驗，會教。"
          maxLength={500}
        />
      </div>

      {err && <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800">{err}</p>}

      <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
        {busy ? (editing ? '儲存中…' : '發布中…') : editing ? '儲存變更' : '發布工作'}
      </button>
    </form>
  );
}
