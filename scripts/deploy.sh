#!/usr/bin/env bash
# Deploy aman web-nuha (Althea) — build TIDAK PERNAH menyentuh .next yang
# sedang dipakai server live, jadi situs tetap jalan selama build.
#
# Alur: build ke .next-staging -> rakit runtime standalone di dalamnya ->
# bila sukses, tukar .next-staging menjadi .next (yang lama disimpan sebagai
# .next-prev) -> restart service sekali -> health check. Bila build gagal
# atau health check gagal: app live tidak berubah / di-rollback otomatis.
#
# Sejak Fase A+B (2026-10-12):
# - Cache Turbopack PERSISTEN di /opt/nuha/.turbopack-cache (di-symlink ke
#   staging), tidak lagi disalin bolak-balik ratusan MB tiap deploy.
# - `prisma generate` dilewati bila skema + versi Prisma tidak berubah
#   (sidik jari di /opt/nuha/.deploy-state/prisma.fp).
# - Deploy dilewati (SKIP) bila sidik sumber (HEAD + status git + .env +
#   config build) sama dengan deploy sukses terakhir dan app sehat.
#   Paksa dengan FORCE=1 bash scripts/deploy.sh.
# - Service menjalankan RUNTIME STANDALONE (.next/standalone/server.js),
#   bukan `next start`. Skrip ini merakit standalone sebelum swap (static,
#   public, docs-assets, .env). Build langsung di direktori live TANPA
#   skrip ini menghasilkan standalone tanpa rakitan itu — JANGAN.
#
# WAJIB dipakai semua agen AI. JANGAN `npm run build` langsung di direktori
# ini selagi service jalan — itu penyebab error 500 saat testing.
set -euo pipefail

cd /opt/nuha/apps
export PATH=/home/rania/.local/bin:$PATH
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
SERVICE=nuha-apps.service
STAGE=.next-staging
LIVE=.next
PREV=.next-prev
STATE_DIR=/opt/nuha/.deploy-state
CACHE_DIR=/opt/nuha/.turbopack-cache
mkdir -p "$STATE_DIR"

# Kunci anti-tabrakan: dua deploy yang berjalan bersamaan berebut
# .next-staging dan saling menukar .next di tengah tracing (pernah kejadian:
# standalone gagal salin dengan ENOENT). Satu deploy saja pada satu waktu.
exec 9>/tmp/nuha-apps-deploy.lock
if ! flock -n 9; then
  echo "[deploy] Deploy lain sedang berjalan — batal, coba lagi nanti."
  exit 1
fi

# --- Sidik sumber: lewati deploy bila tidak ada perubahan & app sehat ---
src_fp() {
  {
    git rev-parse HEAD 2>/dev/null
    git status --porcelain 2>/dev/null
    sha256sum .env 2>/dev/null | awk '{print $1}'
    sha256sum scripts/deploy.sh next.config.mjs package.json 2>/dev/null | awk '{print $1}'
  } | sha256sum | awk '{print $1}'
}
FP_NOW=$(src_fp)
if [ "${FORCE:-0}" != "1" ] && [ -f "$STATE_DIR/last-src.fp" ] && [ "$FP_NOW" = "$(cat "$STATE_DIR/last-src.fp")" ]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3411/apps/login || true)
  if [ "$code" = "200" ]; then
    echo "[deploy] SKIP: tidak ada perubahan sejak deploy sukses terakhir & app sehat (pakai FORCE=1 untuk memaksa)."
    exit 0
  fi
  echo "[deploy] sumber tidak berubah tapi app tidak sehat (HTTP $code) — tetap deploy."
fi

# --- Cache Turbopack persisten (symlink, bukan salin) ---
# Migrasi sekali jalan: cache lama yang masih berupa folder asli di dalam
# .next live dipindah ke lokasi persisten.
if [ -d "$LIVE/cache/turbopack" ] && [ ! -L "$LIVE/cache/turbopack" ] && [ ! -e "$CACHE_DIR" ]; then
  echo "[deploy] memigrasi cache turbopack ke $CACHE_DIR..."
  mv "$LIVE/cache/turbopack" "$CACHE_DIR"
fi
mkdir -p "$CACHE_DIR"
rm -rf "$STAGE/cache"
mkdir -p "$STAGE/cache"
ln -s "$CACHE_DIR" "$STAGE/cache/turbopack"
echo "[deploy] cache turbopack: symlink ke $CACHE_DIR"

# tsconfig meng-include .next/types milik build live; validator rute di sana
# basi bila ada route yang dihapus -> typecheck gagal. Bersihkan dulu.
# Aman: file itu hanya dipakai saat build, bukan oleh runtime server.
rm -rf "$LIVE/types"

# --- Build (lewati prisma generate bila skema tidak berubah) ---
PRISMA_FP=$({ sha256sum prisma/schema.prisma | awk '{print $1}'; grep -E '"(prisma|@prisma/client)":' package.json; } | sha256sum | awk '{print $1}')
echo "[deploy] build ke $STAGE (app live tetap jalan)..."
if [ -f "$STATE_DIR/prisma.fp" ] && [ "$PRISMA_FP" = "$(cat "$STATE_DIR/prisma.fp")" ] && [ -d node_modules/.prisma/client ]; then
  echo "[deploy] skema Prisma tidak berubah — lewati prisma generate."
  BUILD_CMD=(./node_modules/.bin/next build)
else
  BUILD_CMD=(npm run build)
fi
if ! NEXT_DIST_DIR=$STAGE "${BUILD_CMD[@]}"; then
  echo "[deploy] BUILD GAGAL — app live tidak disentuh."
  exit 1
fi
echo "$PRISMA_FP" > "$STATE_DIR/prisma.fp"

# --- Rakit runtime standalone (yang dijalankan service) ---
echo "[deploy] merakit runtime standalone..."
SA="$STAGE/standalone"
if [ ! -f "$SA/server.js" ]; then
  echo "[deploy] $SA/server.js tidak ditemukan — build tidak lengkap, live tidak disentuh."
  exit 1
fi
# distDir tertanam di config hasil build (".next-staging" selama deploy
# staging) dan server standalone mencari aset statis di <distDir>/static
# relatif terhadap folder standalone — resolusinya terjadi saat server
# start, jadi static WAJIB terakit sebelum swap/restart, kalau tidak semua
# /_next/static kena 404 (kejadian 2026-10-12 saat pertama pindah runtime).
DIST=$(grep -o '"distDir": *"[^"]*"' "$STAGE/required-server-files.json" | head -1 | sed 's/.*: *"//; s/"$//')
DIST=${DIST:-.next}
mkdir -p "$SA/$DIST"
rm -rf "$SA/$DIST/static"
cp -a "$STAGE/static" "$SA/$DIST/static"
rm -rf "$SA/public"
cp -a public "$SA/public"
[ -d "$SA/docs-assets" ] || cp -a docs-assets "$SA/docs-assets"
# Salinan .next-prev kadang ikut ter-trace ke dalam standalone — sampah.
rm -rf "$SA/.next-prev"
cp .env "$SA/.env"

echo "[deploy] build OK. Menukar direktori build & restart service..."
systemctl --user stop "$SERVICE" || true
rm -rf "$PREV"
[ -d "$LIVE" ] && mv "$LIVE" "$PREV"
mv "$STAGE" "$LIVE"
# Cache Turbopack di $PREV tidak akan pernah dibaca lagi (cache persisten
# hidup di $CACHE_DIR) dan runtime tidak memakainya — buang agar disk tidak
# menampung salinan cache ekstra. Rollback tetap aman: server berjalan
# tanpa cache build; hanya deploy sesudah rollback yang dingin.
rm -rf "$PREV/cache" || true
systemctl --user start "$SERVICE"

echo "[deploy] health check..."
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3411/apps/login || true)
  if [ "$code" = "200" ]; then
    echo "$FP_NOW" > "$STATE_DIR/last-src.fp"
    echo "[deploy] SEHAT: /apps/login 200 (BUILD_ID $(cat $LIVE/BUILD_ID)) — total ${SECONDS} detik"
    exit 0
  fi
  sleep 2
done

echo "[deploy] HEALTH CHECK GAGAL — rollback ke build sebelumnya..."
systemctl --user stop "$SERVICE" || true
rm -rf "$LIVE"
[ -d "$PREV" ] && mv "$PREV" "$LIVE"
systemctl --user start "$SERVICE"
exit 1
