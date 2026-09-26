'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DuckMark } from '@/components/Logo';
import { CATEGORIES, FEATURED } from '@/lib/categories';
import { CITIES } from '@/lib/taiwan';
import { toISODate } from '@/lib/types';

type Mode = 'hire' | 'work';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('hire');

  const [date, setDate] = useState(toISODate(new Date()));
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');

  function search(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    if (date) q.set('date', date);
    if (category) q.set('category', category);
    if (city) q.set('city', city);
    router.push(`/discover?${q}`);
  }

  return (
    <div className="space-y-16">
      {/* ---------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-brand-50 via-cream to-duck-300/25 px-6 py-10 sm:px-10 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-200/30 blur-3xl"
        />
        <div className="relative">
          {/* 雙向切換 */}
          <div className="mb-7 inline-flex rounded-full bg-brand-100/70 p-1">
            <button
              onClick={() => setMode('hire')}
              className={`pill-tab ${mode === 'hire' ? 'pill-tab-on' : 'pill-tab-off'}`}
            >
              我要找人
            </button>
            <button
              onClick={() => setMode('work')}
              className={`pill-tab ${mode === 'work' ? 'pill-tab-on' : 'pill-tab-off'}`}
            >
              我要找工作
            </button>
          </div>

          {mode === 'hire' ? (
            <div key="hire" className="animate-rise">
              <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                這個時段，
                <br className="sm:hidden" />
                <span className="text-brand-600">誰有空？</span>
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft sm:text-base">
                不用開職缺、不用等應徵。選好日期跟你需要的事，
                直接看到那個時段有空的人、他們會做什麼、開價多少。
              </p>

              <form onSubmit={search} className="card mt-7 space-y-3 p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label">哪一天</label>
                    <input
                      type="date"
                      value={date}
                      min={toISODate(new Date())}
                      onChange={(e) => setDate(e.target.value)}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="label">需要什麼</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="field"
                    >
                      <option value="">不限</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.emoji} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">地區</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="field"
                    >
                      <option value="">全台灣</option>
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full !py-3 text-base">
                  找出有空的人
                </button>
              </form>

              <p className="mt-3 text-center text-sm text-ink-soft">
                沒找到合適的？
                <Link href="/jobs/quick" className="font-semibold text-brand-600 underline">
                  30 秒說你要找什麼人
                </Link>
              </p>
            </div>
          ) : (
            <div key="work" className="animate-rise">
              <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                把你的空檔
                <br className="sm:hidden" />
                <span className="text-brand-600">擺出來</span>
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft sm:text-base">
                你不是來求職的，你是來開店的。
                填一次你有空的時間，寫下你能做的每件事跟各自的開價 ——
                <span className="font-semibold text-ink">
                  當家教 520、遛狗 220、到府清潔 650
                </span>
                ，通通可以並存。
              </p>

              <ul className="mt-6 space-y-2.5">
                {[
                  '一人多技能，每項服務各自報價',
                  '月曆點選有空的日子，一鍵複製到未來幾週',
                  '缺人的店家、攤販、家長直接來邀約你',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[15px] text-ink-soft">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                      ✓
                    </span>
                    {t}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/signup" className="btn-primary !py-3 text-base">
                  免費建立我的空檔
                </Link>
                <Link href="/how-much" className="btn-ghost !py-3 text-base">
                  先算算我的空檔值多少
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* --------------------------------------------------- 首頁突顯分類 */}
      <section>
        <h2 className="text-xl font-extrabold tracking-tight">大家最常找的</h2>
        <p className="mt-1 text-sm text-ink-soft">
          攤販、家長、寵物主 —— 這些人在人力銀行開不了職缺，卻天天需要人。
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FEATURED.map((c, i) => (
            <Link
              key={c.id}
              href={`/discover?category=${c.id}`}
              style={{ animationDelay: `${i * 45}ms` }}
              className="card card-hover animate-rise flex flex-col items-center gap-2 px-3 py-5 text-center"
            >
              <span className="text-3xl">{c.emoji}</span>
              <span className="text-sm font-bold">{c.name}</span>
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => !c.featured)
            .slice(0, 12)
            .map((c) => (
              <Link key={c.id} href={`/discover?category=${c.id}`} className="chip hover:border-brand-300">
                {c.emoji} {c.name}
              </Link>
            ))}
          <Link href="/discover" className="chip hover:border-brand-300">
            全部分類 →
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------ 怎麼運作 */}
      <section className="card p-6 sm:p-8">
        <h2 className="text-xl font-extrabold tracking-tight">怎麼運作</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            { n: '1', t: '擺出空檔', d: '在月曆點選你有空的日子與時段，可一鍵複製到未來幾週。' },
            { n: '2', t: '列出能做的事', d: '家教、遛狗、清潔…想加幾項就加幾項，每項各自開價。' },
            { n: '3', t: '收到邀約', d: '缺人的一方挑好你的時段與服務直接邀約，接受後才互相看到聯絡方式。' },
          ].map((s) => (
            <li key={s.n} className="relative">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 font-black text-white">
                {s.n}
              </span>
              <h3 className="mt-3 font-bold">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------ 跟人力銀行差在哪 */}
      <section>
        <h2 className="text-xl font-extrabold tracking-tight">跟人力銀行差在哪</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left">
                <th className="w-1/3 pb-3" />
                <th className="pb-3 font-semibold text-ink-muted">一般人力銀行</th>
                <th className="pb-3 font-semibold text-brand-600">有空鴨</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['目錄的單位', '職缺', '有空的人'],
                ['誰先出手', '雇主貼職缺，等人應徵', '雇主直接搜時段找人'],
                ['一個人的身價', '只有一個', '每項技能各自開價'],
                ['誰能當雇主', '公司行號為主', '攤販、家長、寵物主都可以'],
                ['定價權', '雇主', '雙方各自開價'],
              ].map(([k, a, b], i) => (
                <tr key={k} className={i % 2 ? 'bg-brand-50/40' : ''}>
                  <td className="rounded-l-xl px-3 py-3 font-semibold">{k}</td>
                  <td className="px-3 py-3 text-ink-muted">{a}</td>
                  <td className="rounded-r-xl px-3 py-3 font-semibold text-ink">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------------------------------------------------- 結尾 */}
      <section className="relative overflow-hidden rounded-3xl bg-ink px-6 py-12 text-center sm:px-10">
        <div className="relative mx-auto max-w-md">
          <div className="mx-auto w-fit">
            <DuckMark size={56} />
          </div>
          <h2 className="mt-5 text-2xl font-black text-white">有空啊？那就擺出來吧</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            註冊只要 30 秒。填好一個時段，就可能有人來找你。
          </p>
          <Link href="/signup" className="btn-primary mt-6 !py-3 text-base">
            免費加入有空鴨
          </Link>
        </div>
      </section>

    </div>
  );
}
