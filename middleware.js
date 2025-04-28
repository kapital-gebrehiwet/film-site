import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(request) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });
  
  const { pathname } = request.nextUrl;

  // Debug logs
  console.log('Middleware - Path:', pathname);
  console.log('Middleware - Full Token:', JSON.stringify(token, null, 2));

  // If user is not logged in and trying to access protected routes
  if (!token && (pathname.startsWith('/admin') || pathname.startsWith('/user'))) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // If user is logged in, check session expiration
  if (token) {
    const isAdmin = token.isAdmin;
    
    console.log('Middleware - Token Details:', {
      isAdmin,
      rawToken: token
    });

    // Redirect admin users trying to access user routes to admin dashboard
    if (pathname.startsWith('/user') && isAdmin) {
      console.log('Middleware - Redirecting admin from user route to admin');
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // Redirect non-admin users trying to access admin routes to user dashboard
    if (pathname.startsWith('/admin') && !isAdmin) {
      console.log('Middleware - Redirecting non-admin from admin route to user');
      return NextResponse.redirect(new URL('/user', request.url));
    }

    // If on home page and logged in, redirect based on role
    if (pathname === '/') {
      console.log('Middleware - Home page redirect based on role:', isAdmin ? 'admin' : 'user');
      return NextResponse.redirect(new URL(isAdmin ? '/admin' : '/user', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/:path*', '/user/:path*']
};
