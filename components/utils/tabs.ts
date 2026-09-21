export type TabDef = { key: string; label: string };

/** Ambil tab aktif dari searchParams, jatuh ke tab pertama bila tidak dikenal. */
export function tabAktif(tabs: TabDef[], raw?: string | string[]): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return tabs.some((t) => t.key === value) ? (value as string) : tabs[0].key;
}
