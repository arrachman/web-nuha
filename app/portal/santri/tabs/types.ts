import type { Santri, Unit, Kelas, Room, Dormitory } from '@prisma/client';

/** Bentuk data santri yang dipakai lintas tab portal santri, hasil include page.tsx. */
export type SantriLengkap = Santri & {
  unit: Unit | null;
  kelas: Kelas | null;
  room: (Room & { dormitory: Dormitory }) | null;
};
