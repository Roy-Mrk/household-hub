'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import type { User } from '@supabase/supabase-js';

export default function ClientLayout({ children, user }: { children: React.ReactNode; user: User | null }) {
  const pathname = usePathname();
  const showHeader = pathname !== '/login';

  return (
    <>
      {showHeader && <Header initialUser={user} />}
      {children}
    </>
  );
}
