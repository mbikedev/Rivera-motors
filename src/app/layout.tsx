import type { ReactNode } from 'react';
import './globals.css';

// The <html> element lives in app/[locale]/layout.tsx (public site) and app/admin/layout.tsx (admin).
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
