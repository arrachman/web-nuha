import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    foreignAddress: { findFirst },
  },
}));

import { parseRegionId, validateDomesticAddressExclusivity } from '@/lib/wilayah';

describe('parseRegionId', () => {
  it('mempertahankan bigint di atas batas Number aman', () => {
    expect(parseRegionId('9007199254740993')).toBe(9007199254740993n);
  });

  it('menolak ID yang bukan integer positif', () => {
    expect(parseRegionId('12.3')).toBeNull();
    expect(parseRegionId('-12')).toBeNull();
    expect(parseRegionId('desa-12')).toBeNull();
  });
});

describe('validateDomesticAddressExclusivity', () => {
  beforeEach(() => findFirst.mockReset());

  it('tidak memeriksa alamat luar negeri ketika alamat domestik tidak diubah', async () => {
    await expect(validateDomesticAddressExclusivity(1n, { fullName: 'Nama baru' })).resolves.toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('menolak alamat domestik saat alamat luar negeri aktif ada', async () => {
    findFirst.mockResolvedValue({ id: 1n });
    await expect(validateDomesticAddressExclusivity(1n, { regionId: 40784n })).resolves.toBe('Alamat domestik tidak dapat dipakai bersama alamat luar negeri aktif.');
    expect(findFirst).toHaveBeenCalledWith({ where: { personId: 1n, isCurrent: true }, select: { id: true } });
  });

  it('mengizinkan pengosongan alamat domestik meskipun alamat luar negeri aktif ada', async () => {
    await expect(validateDomesticAddressExclusivity(1n, { addressLine: '', regionId: null })).resolves.toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
