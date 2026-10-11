#!/usr/bin/env bash
# Deploy aman web-nuha (Althea) — build TIDAK PERNAH menyentuh .next yang
# sedang dipakai server live, jadi situs tetap jalan selama build.
#
# Alur: build ke .next-staging -> bila sukses, tukar .next-staging menjadi
# .next (yang lama disimpan sebagai .next-prev) -> restart service sekali ->
# health check. Bila build gagal atau health check gagal: app live tidak
# berubah / di-rollback otomatis.
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

# Kunci anti-tabrakan: dua deploy yang berjalan bersamaan berebut
# .next-staging dan saling menukar .next di tengah tracing (pernah kejadian:
# standalone gagal salin dengan ENOENT). Satu deploy saja pada satu waktu.
exec 9>/tmp/nuha-apps-deploy.lock
if ! flock -n 9; then
  echo "[deploy] Deploy lain sedang berjalan — batal, coba lagi nanti."
  exit 1
fi

# Hangatkan cache Turbopack: staging selalu folder baru, jadi tanpa langkah
# ini setiap build mulai dingin. Cache build sebelumnya tersimpan di
# $LIVE/cache/turbopack (turbopackFileSystemCacheForBuild di next.config.mjs)
# — salin ke staging supaya hanya modul yang berubah yang dikompilasi ulang.
if [ -d "$LIVE/cache/turbopack" ]; then
  echo "[deploy] menyalin cache turbopack dari build sebelumnya..."
  mkdir -p "$STAGE/cache"
  cp -a "$LIVE/cache/turbopack" "$STAGE/cache/" || true
fi

# tsconfig meng-include .next/types milik build live; validator rute di sana
# basi bila ada route yang dihapus -> typecheck gagal. Bersihkan dulu.
# Aman: file itu hanya dipakai saat build, bukan oleh runtime server.
rm -rf "$LIVE/types"

echo "[deploy] build ke $STAGE (app live tetap jalan)..."
if ! NEXT_DIST_DIR=$STAGE npm run build; then
  echo "[deploy] BUILD GAGAL — app live tidak disentuh."
  exit 1
fi

echo "[deploy] build OK. Menukar direktori build & restart service..."
systemctl --user stop "$SERVICE" || true
rm -rf "$PREV"
[ -d "$LIVE" ] && mv "$LIVE" "$PREV"
mv "$STAGE" "$LIVE"
systemctl --user start "$SERVICE"

echo "[deploy] health check..."
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3411/apps/login || true)
  if [ "$code" = "200" ]; then
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
