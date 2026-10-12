'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiPath } from '@/lib/api-path';
import { Button } from '@/components/atoms/Button';

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

  return <Button varian="ghost-terang" onClick={logout} disabled={isLoading}>{isLoading ? 'Keluar…' : 'Keluar'}</Button>;
}