# 有空鴨 FreeDuck 🦆

以「人的空閒時段」為單位的供給端目錄。

一般人力銀行的目錄單位是**職缺**：雇主貼職缺、工人來應徵。
有空鴨反過來——目錄單位是**有空的人**：你把空檔和能做的事擺出來，缺人的一方直接來預約。

| | 一般人力銀行 | 有空鴨 |
|---|---|---|
| 目錄的單位 | 職缺 | 有空的人 |
| 誰先出手 | 雇主貼職缺，等人應徵 | 雇主直接搜時段找人 |
| 一個人的身價 | 只有一個 | 每項技能各自開價 |
| 誰能當雇主 | 公司行號為主 | 攤販、家長、寵物主都可以 |

---

## 技術棧

- **Next.js 16**（App Router）+ **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Supabase**：Postgres + Auth（Email/密碼）+ Realtime（站內聊天）+ Row Level Security

---

## 啟動步驟

### 1. 建立 Supabase 專案

到 [supabase.com](https://supabase.com) 開一個免費專案（選 **Northeast Asia (Tokyo)** 區域延遲最低）。

### 2. 執行資料庫 schema

Supabase Dashboard → **SQL Editor** → New query，依序貼上並執行：

1. `supabase/migrations/0001_init.sql`　（建表）
2. `supabase/migrations/0002_rls_and_functions.sql`　（RLS、觸發器、搜尋函式）

> 兩個都要跑，順序不能反。

### 3. 關掉信箱驗證（測試期建議）

Dashboard → **Authentication → Sign In / Providers → Email** →
把 **Confirm email** 關掉，這樣註冊完可以直接登入，不用去收信。
正式上線前記得打開。

### 4. 填入金鑰

```bash
cp .env.local.example .env.local
```

Dashboard → **Project Settings → API**，把 `Project URL` 和 `anon public` key 貼進去。

### 5. 跑起來

```bash
npm install
npm run dev
```

打開 http://localhost:3000

> **沒填金鑰也能跑。** 這時是「示範模式」：搜尋、工作列表都有假資料可以點，
> 只是不能註冊登入。金鑰填好後示範資料自動消失。

---

## 專案結構

```
src/
├─ app/
│  ├─ page.tsx              首頁（我要找人 / 我要找工作 雙向切換）
│  ├─ discover/             ★ 搜尋「有空的人」—— 本站核心
│  ├─ jobs/                 工作列表 / 發布 / 詳情
│  ├─ worker/[id]/          個人公開頁 + 邀約
│  ├─ me/
│  │  ├─ page.tsx           我的頁面（邀約收發、快速入口）
│  │  ├─ availability/      ★ 月曆多選空檔 + 一鍵複製 N 週
│  │  ├─ services/          ★ 一人多技能，每項各自報價
│  │  └─ profile/           基本資料 + 聯絡方式（隱私控管）
│  ├─ chat/                 站內即時聊天（Supabase Realtime）
│  └─ login|signup/
├─ components/              共用 UI
├─ lib/
│  ├─ categories.ts         33 個服務分類（唯一的顯示名稱來源）
│  ├─ taiwan.ts             22 縣市 + 368 鄉鎮市區
│  ├─ types.ts              型別與格式化工具
│  ├─ demo.ts               示範模式假資料
│  └─ supabase/             client / server / config
└─ proxy.ts                 路由保護（Next 16 的 middleware）
```

---

## 資料模型的關鍵決定

**薪資掛在「服務項目」上，不是掛在時段上。**

同一個人週日有空，去當家教是 520/hr、幫忙遛狗是 220/hr、到府清潔是 650/hr。
所以拆成兩張獨立的表：

```
availabilities   我什麼時候有空      （date, start_time, end_time）
services         我能做什麼＋各自報價 （category_id, rate, rate_unit）
```

邀約 = 挑「某人的**某個時段**」×「**某個服務**」，價格自動帶入。
`search_workers()` 這個 RPC 就是把兩張表交叉起來反查人。

---

## 隱私設計

聯絡方式（手機、LINE ID）獨立成 `contacts` 表，RLS 規則是：

```sql
using (user_id = auth.uid() or public.is_connected(auth.uid(), user_id))
```

`is_connected()` 只在「邀約被接受」或「應徵被錄取」時回傳 true。
換句話說**媒合成立前，任何人都撈不到別人的聯絡方式**——包含直接打 API。

---

## 部署

推到 GitHub 後接 [Vercel](https://vercel.com)，在 Environment Variables 填入同樣兩個
`NEXT_PUBLIC_*` 變數即可。Supabase 免費方案足夠早期使用。

---

## 法規定位

平台**只做資訊媒合**：

- 不經手薪資（雙方線下自付）→ 迴避電子支付／第三方支付的特許要求
- 不主動配對、不抽成、不簽約 → 定位近似 591 或 FB 社團的資訊佈告欄，
  而非《就業服務法》下的「私立就業服務機構」

⚠️ 這是產品定位上的設計，不是法律意見。要真的商業化營運前請諮詢律師，
特別是「未來想抽成或代收薪資」的時候，定位會整個改變。

---

## 上線後的第一個難題：冷啟動

供給端目錄的雞生蛋問題比職缺板嚴重——職缺板有幾則職缺就有價值，
這裡要先有一批人擺滿時段才有人來看。

建議先鎖 **單一垂直 × 單一區域**（例如「寵物照顧 + 居家清潔，先做大台北」）
把密度做起來，再橫向展開。首頁的 `featured` 分類（`lib/categories.ts`）
就是為此保留的開關。
