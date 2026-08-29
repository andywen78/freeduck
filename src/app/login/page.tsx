import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';

export const metadata = { title: '登入 — 有空鴨' };

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
