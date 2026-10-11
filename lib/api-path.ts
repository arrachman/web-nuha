/**
 * Path API untuk fetch dari browser. Bila app berjalan di bawah basePath
 * (deployment Althea: /apps), fetch('/api/...') polos dari browser akan
 * mendarat di root domain dan 404 — awalannya harus ikut. Nilainya disuntik
 * next.config lewat NEXT_PUBLIC_BASE_PATH; kosong berarti app di root.
 */
export function apiPath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${base}${path}`;
}
