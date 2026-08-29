'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from './Modal';
import { categoryOf } from '@/lib/categories';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useUser } from '@/lib/useUser';
import { formatDate, formatRate, hhmm, type Availability, type Service } from '@/lib/types';

export function InviteDialog({
  workerId,
  workerName,
  availabilities,
  services,
  preselectAvailability,
}: {
  workerId: string;
  workerName: string;
  availabilities: Availability[];
  services: Service[];
  preselectAvailability?: string;
}) {
  const router = useRouter();
  const { userId, unconfigured } = useUser();

  const [open, setOpen] = useState(false);
  const [availId, setAvailId] = useState(
    preselectAvailability && availabilities.some((a) => a.id === preselectAvailability)
      ? preselectAvailability
      : (availabilities[0]?.id ?? ''),
  );
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const canInvite = availabilities.length > 0 && services.length > 0;

  async function send() {
    if (!userId) return;
    setBusy(true);
    setErr(null);

    const { error } = await supabaseBrowser().from('invites').insert({
      employer_id: userId,
      worker_id: workerId,
      availability_id: availId,
      service_id: serviceId,
      message: message.trim() || null,
      offered_rate: service?.rate ?? null,
    });

    setBusy(false);
    if (error) {
      setErr(
        error.code === '23505'
          ? '你已經對這個時段送過邀約了'
          : `送出失敗：${error.message}`,
      );
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (unconfigured) {
    return (
      <button className="btn-primary w-full !py-3" disabled>
        示範模式無法邀約
      </button>
    );
  }

  if (!userId) {
    return (
      <Link href={`/login?next=/worker/${workerId}`} className="btn-primary w-full !py-3">
        登入後邀約 {workerName}
      </Link>
    );
  }

  if (userId === workerId) {
    return (
      <p className="rounded-xl bg-cream px-4 py-3 text-center text-sm text-ink-soft">
        這是你自己的公開頁面 —— 別人看到的就是這個樣子
      </p>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl bg-ok-bg px-4 py-3 text-center text-sm font-semibold text-ok">
        邀約已送出，等 {workerName} 回覆
      </div>
    );
  }

  if (!canInvite) {
    return (
      <p className="rounded-xl bg-cream px-4 py-3 text-center text-sm text-ink-soft">
        {workerName} 目前沒有可預約的時段
      </p>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary w-full !py-3 text-base">
        邀約 {workerName}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`邀約 ${workerName}`}
        subtitle="挑一個他有空的時段，和你要請他做的事"
      >
        <div className="space-y-4">
          <div>
            <label className="label">選一個時段</label>
            <select value={availId} onChange={(e) => setAvailId(e.target.value)} className="field">
              {availabilities.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatDate(a.date)} {hhmm(a.start_time)}–{hhmm(a.end_time)}
                </option>
              ))}
            </select>
          </div>
    
          <div>
            <label className="label">要請他做什麼</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="field">
              {services.map((s) => {
                const c = categoryOf(s.category_id);
                return (
                  <option key={s.id} value={s.id}>
                    {c?.emoji} {c?.name}
                    {s.title ? ` · ${s.title}` : ''} — {formatRate(s.rate, s.rate_unit)}
                  </option>
                );
              })}
            </select>
          </div>
    
          <div>
            <label className="label">給他的訊息（選填）</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="field resize-none"
              placeholder="你好，我在寧夏夜市擺滷味攤，想請你幫忙顧攤跟結帳。"
              maxLength={300}
            />
          </div>

          {service && (
            <div className="rounded-xl bg-cream px-3 py-2.5 text-sm">
              <span className="text-ink-soft">他的開價 </span>
              <span className="font-black text-brand-600">
                {formatRate(service.rate, service.rate_unit)}
              </span>
            </div>
          )}

          {err && (
            <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800">{err}</p>
          )}

          <p className="text-xs leading-relaxed text-ink-muted">
            🔒 聯絡方式不會自動交換 —— 對方接受邀約後，你可以在聊天室裡「請求聯絡方式」，
            由他決定要不要給。薪資由雙方自行議定與給付，平台不經手。
          </p>

          <div className="flex gap-2 pt-1">
            <button onClick={send} disabled={busy} className="btn-primary flex-1">
              {busy ? '送出中…' : '送出邀約'}
            </button>
            <button onClick={() => setOpen(false)} className="btn-ghost">
              取消
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
