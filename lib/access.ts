import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { readSession, type SessionPayload } from '@/lib/auth';

/**
 * Gate a page on the same menu/role grant that decides sidebar visibility, so a
 * hidden menu is genuinely unreachable rather than merely unlinked.
 */
export async function requirePage(menuKey: string): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) redirect('/login');

  if (menuKey !== 'dashboard') {
    const granted = await prisma.menuRole.count({
      where: { menu: { key: menuKey }, role: { key: { in: session.peran } } },
    });
    if (granted === 0) redirect('/');
  }

  return session;
}
