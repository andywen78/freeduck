import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';

export const metadata = { title: '註冊 — 有空鴨' };

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
