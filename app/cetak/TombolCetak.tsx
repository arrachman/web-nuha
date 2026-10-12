'use client';

import { Button } from '@/components/atoms/Button';

export function TombolCetak() {
  return <Button type="button" onClick={() => window.print()}>Cetak</Button>;
}
