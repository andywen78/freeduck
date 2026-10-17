'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DuckMark } from '@/components/Logo';
import { NOTE_BG, Note, type NoteColor } from '@/components/Note';
import { CATEGORIES, FEATURED } from '@/lib/categories';
import { formatRange, rateOf } from '@/lib/rates';
import { CITIES } from '@/lib/taiwan';
import { toISODate } from '@/lib/types';

type Mode = 'hire' | 'work';

/** 公佈欄上的便條都是示意，畫面上會標明 */
const SAMPLE_NOTES: { color: NoteColor; tilt: number; fix: 'pin' | 'tape'; when: string; what: string; price: string; who: string }[] = [
  { color: 'yellow', tilt: -3, fix: 'pin', when: '週六下午有空！', what: '遛狗', price: '$250／次', who: '阿哲・中正區' },
  { color: 'pink', tilt: 2.5, fix: 'tape', when: '平日晚上 7 點後', what: '家教', price: '$520／小時', who: '小芸・大安區' },
  { color: 'blue', tilt: 1.5, fix: 'tape', when: '週日一整天', what: '寵物保母', price: '$500／次', who: '陳大哥・信義區' },
];

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
    <div className="space-y-20 pb-8">
      {/* ------------------------------------------------- Hero：里民公佈欄 */}
      <section
        className="cork-board relative -mx-4 px-4 py-8 sm:mx-0 sm:px-8 sm:py-10"
      >
        <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
          {/* 公告紙：主要動作 */}
          <Note tilt={-0.6} fix="tape" className="bg-surface px-5 pb-6 pt-7 sm:px-7">
            <div className="mb-5 flex gap-5 text-[15px] font-bold">
              {(
                [
                  ['hire', '我要找人'],
                  ['work', '我要找工作'],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={`whitespace-nowrap border-b-2 pb-1 transition-colors ${
                    mode === m ? 'border-brand-600 text-ink' : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === 'hire' ? (
              <>
                <h1 className="font-[family-name:var(--font-hand)] text-[2.5rem] leading-[1.2] sm:text-[3.4rem]">
                  這個時段，
                  <br className="hidden lg:block" />
                  誰有空？
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  不用開職缺、不用等應徵。選好日期跟你需要的事，
                  直接看到那個時段有空的人、他們會做什麼、開價多少。
                </p>

                <form onSubmit={search} className="mt-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
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
                  <p className="text-sm text-ink-soft">
                    沒找到合適的？
                    <Link href="/jobs/quick" className="font-semibold text-ink underline underline-offset-4">
                      30 秒說你要找什麼人
                    </Link>
                  </p>
                </form>
              </>
            ) : (
              <>
                <h1 className="font-[family-name:var(--font-hand)] text-[2.5rem] leading-[1.2] sm:text-[3.4rem]">
                  把你的空檔擺出來
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  你不是來求職的，你是來開店的。
                  填一次你有空的時間，寫下你能做的每件事跟各自的開價 ——
                  <span className="font-semibold text-ink">當家教 520、遛狗 220、到府清潔 650</span>
                  ，通通可以並存。缺人的店家、攤販、家長會直接來邀約你。
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/signup" className="btn-primary !py-3 text-base">
                    免費建立我的空檔
                  </Link>
                  <Link href="/how-much" className="btn-ghost !py-3 text-base">
                    先算算我的空檔值多少
                  </Link>
                </div>
              </>
            )}
          </Note>

          {/* 鄰居貼的便條（示意） */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 pt-2 font-[family-name:var(--font-hand)] text-ink sm:gap-x-6">
            {SAMPLE_NOTES.map((n) => (
              <Note key={n.who} tilt={n.tilt} fix={n.fix} className={`${NOTE_BG[n.color]} px-4 pb-4 pt-6`}>
                <div className="text-lg leading-snug sm:text-xl">{n.when}</div>
                <div className="mt-2 text-xl leading-snug sm:text-2xl">{n.what}</div>
                <div className="whitespace-nowrap text-xl leading-snug sm:text-2xl">{n.price}</div>
                <div className="mt-3 text-right text-sm text-ink-soft">—— {n.who}</div>
              </Note>
            ))}

            {mode === 'hire' ? (
              /* 撕條傳單：台灣電線桿上最常見的那種 */
              <Note tilt={-1.5} fix="pin" className="bg-surface pt-6">
                <div className="px-4 text-lg leading-snug sm:text-xl">到府打掃</div>
                <div className="mt-1 px-4 text-sm leading-snug text-ink-soft">每週三、五上午</div>
                <div className="mt-1 whitespace-nowrap px-4 text-xl sm:text-2xl">$650／次</div>
                <div className="mt-3 flex border-t border-dashed border-line-strong">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`flex-1 border-dashed border-line-strong py-2 text-center text-xs leading-tight text-ink-soft [writing-mode:vertical-rl] ${
                        i ? 'border-l' : ''
                      } ${i === 1 ? 'invisible' : ''}`}
                    >
                      找阿美
                    </span>
                  ))}
                </div>
              </Note>
            ) : (
              <Link
                href="/signup"
                className="flex min-h-36 rotate-[-1.5deg] items-center justify-center border-2 border-dashed border-white/70 p-4 text-center text-xl leading-snug text-white transition-colors hover:bg-white/10"
              >
                這一格
                <br />
                留給你
              </Link>
            )}

            <p className="col-span-2 text-right font-[family-name:var(--font-noto)] text-xs text-white/85">
              便條為示意，實際內容以站上每個人自己貼的為準
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- 首頁突顯分類 */}
      <section>
        <h2 className="text-xl font-extrabold tracking-tight">先從毛孩的事開始</h2>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">
          攤販、家長、寵物主，這些人在人力銀行開不了職缺，卻天天需要人。
          價格是一般行情，實際以每個人自己的開價為準。
        </p>
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {FEATURED.map((c) => {
            const r = rateOf(c.id);
            return (
              <li key={c.id}>
                <Link
                  href={`/discover?category=${c.id}`}
                  className="group flex items-center gap-4 py-4 hover:bg-surface/70"
                >
                  <span className="text-2xl" aria-hidden>
                    {c.emoji}
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold group-hover:underline group-hover:underline-offset-4">
                      {c.name}
                    </span>
                    {r?.note && <span className="block text-sm text-ink-muted">{r.note}</span>}
                  </span>
                  {r && (
                    <span className="whitespace-nowrap text-sm font-bold tabular-nums">
                      {formatRange(r)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm leading-loose text-ink-soft">
          其他也找得到：
          {CATEGORIES.filter((c) => !c.featured)
            .slice(0, 12)
            .map((c, i) => (
              <span key={c.id}>
                {i > 0 && '、'}
                <Link href={`/discover?category=${c.id}`} className="hover:text-ink hover:underline">
                  {c.name}
                </Link>
              </span>
            ))}
          。
          <Link href="/discover" className="font-semibold text-ink underline underline-offset-4">
            看全部分類
          </Link>
          <span className="mx-2 text-line-strong">|</span>
          <Link href="/rates" className="font-semibold text-ink underline underline-offset-4">
            行情怎麼來的
          </Link>
        </p>
      </section>

      {/* ------------------------------------------------------ 怎麼運作 */}
      <section>
        <h2 className="text-xl font-extrabold tracking-tight">怎麼運作</h2>
        <ol className="mt-6 grid gap-8 sm:grid-cols-3">
          {[
            { t: '擺出空檔', d: '在月曆點選你有空的日子與時段，可一鍵複製到未來幾週。' },
            { t: '列出能做的事', d: '家教、遛狗、清潔…想加幾項就加幾項，每項各自開價。' },
            { t: '收到邀約', d: '缺人的一方挑好你的時段與服務直接邀約，接受後才互相看到聯絡方式。' },
          ].map((s, i) => (
            <li key={s.t} className="border-t-2 border-ink pt-4">
              <span className="font-[family-name:var(--font-hand)] text-3xl text-ink-muted">
                {i + 1}
              </span>
              <h3 className="mt-1 font-bold">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------ 跟人力銀行差在哪 */}
      <section>
        <h2 className="text-xl font-extrabold tracking-tight">跟人力銀行差在哪</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left">
                <th className="w-1/3 pb-3" />
                <th className="pb-3 font-semibold text-ink-muted">一般人力銀行</th>
                <th className="pb-3 font-bold text-ink">有空鴨</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['目錄的單位', '職缺', '有空的人'],
                ['誰先出手', '雇主貼職缺，等人應徵', '雇主直接搜時段找人'],
                ['一個人的身價', '只有一個', '每項技能各自開價'],
                ['誰能當雇主', '公司行號為主', '攤販、家長、寵物主都可以'],
                ['定價權', '雇主', '雙方各自開價'],
              ].map(([k, a, b]) => (
                <tr key={k} className="border-b border-line">
                  <td className="py-3 pr-3 font-semibold">{k}</td>
                  <td className="py-3 pr-3 text-ink-muted">{a}</td>
                  <td className="py-3 font-semibold">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------------------------------------------------- 結尾 */}
      <section className="flex flex-col items-start gap-5 border-t border-line pt-10 sm:flex-row sm:items-center">
        <DuckMark size={48} />
        <div className="flex-1">
          <h2 className="font-[family-name:var(--font-hand)] text-2xl sm:text-3xl">
            有空啊？那就擺出來吧
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            註冊只要 30 秒。填好一個時段，就可能有人來找你。
          </p>
        </div>
        <Link href="/signup" className="btn-primary !py-3 text-base">
          免費加入有空鴨
        </Link>
      </section>
    </div>
  );
}
