import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth';

export default async function AkunLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/login');
  return <>{children}</>;
}
