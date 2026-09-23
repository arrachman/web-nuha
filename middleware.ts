import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// 01-fondasi-auth-rbac-crud.md §2.2: layout staf & portal mengarahkan ke
// /akun/sandi selama mustChangePassword true. Dilakukan di middleware (edge,
// tanpa query DB) karena flag ini sudah ikut di payload JWT sejak login —
// menghindari satu query tambahan di setiap request halaman.
const SESSION_COOKIE = 'nuha_session';
const DIKECUALIKAN = ['/akun/sandi', '/api', '/login', '/_next', '/favicon.ico', '/berkas', '/a', '/r', '/karir', '/ppdb', '/cek-status'];

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? '';
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (DIKECUALIKAN.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.next();

  try {
    const { payload } = await jwtVerify(token, secretKey());
    if ((payload as { mustChangePassword?: boolean }).mustChangePassword === true) {
      const url = request.nextUrl.clone();
      url.pathname = '/akun/sandi';
      return NextResponse.redirect(url);
    }
  } catch {
    // Token tidak valid — biarkan halaman/layout tujuan yang menangani (redirect /login).
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|assets|favicon.ico).*)'],
};
