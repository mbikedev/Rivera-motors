import type { ReactNode } from 'react';
import { LogoMark } from '@/components/layout/logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="bg-card w-full max-w-sm space-y-6 rounded-2xl border p-6 shadow-sm">
        <LogoMark className="size-10" />
        {children}
      </div>
    </main>
  );
}
