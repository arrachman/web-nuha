# Aturan Wajib Agen AI — web-nuha

Aturan ini berlaku untuk SEMUA agen AI (Claude Code, Muse, dan agen lain)
yang mengerjakan repo ini, di server mana pun.

## Commit & Push ke `main` (WAJIB, tanpa kecuali)

1. Setiap agen yang selesai mengerjakan perubahan WAJIB menutup pekerjaannya
   dengan:
   - `git add -A` — masukkan semua perubahan hasil pekerjaannya,
   - `git commit` — dengan pesan yang jelas menjelaskan perubahan,
   - `git push origin main` — push langsung ke branch `main`.
2. **DILARANG membuat branch baru** — termasuk branch fitur, branch backup,
   atau branch eksperimen. Semua pekerjaan dilakukan dan di-push langsung
   ke `main`.
3. Jangan pernah commit file rahasia/runtime: `.env` (dan variannya yang
   berisi kredensial asli), token, cookie, file log (`*.log`),
   `node_modules/`, `.next/`.
4. Setelah push, verifikasi: `git ls-remote origin main` menunjuk commit
   yang baru dibuat dan `git status` bersih. Laporkan hash commit ke user.
5. Bila push ditolak karena `main` berubah oleh agen lain: `git pull --rebase
   origin main`, selesaikan konflik bila ada, lalu push ulang. JANGAN
   force-push menimpa pekerjaan agen lain tanpa instruksi eksplisit user.
6. Jangan meninggalkan pekerjaan dalam keadaan belum ter-commit — working
   tree kotor yang ditinggalkan akan tertimpa/tercampur pekerjaan agen
   berikutnya.
