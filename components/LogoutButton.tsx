'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiPath } from '@/lib/api-path';

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function logout() {
    setIsLoading(true);
    try {
      await fetch(apiPath('/api/auth/logout'), { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return <button className="btn-ghost-terang" onClick={logout} disabled={isLoading}>{isLoading ? 'Keluar…' : 'Keluar'}</button>;
}