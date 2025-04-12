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
  console.log('Middleware - Environment:', {
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    NODE_ENV: process.env.NODE_ENV,
  });

  // If user is not logged in and trying to access protected routes
  if (!token && (pathname.startsWith('/admin') || pathname.startsWith('/user'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If user is logged in
  if (token) {
    const isAdmin = token.isAdmin;
    
    console.log('Middleware - Token Details:', {
      isAdmin,
      rawToken: token
    });

    // Only redirect if trying to access admin routes without admin privileges
    if (pathname.startsWith('/admin') && !isAdmin) {
      console.log('Middleware - Redirecting non-admin from admin route to user');
      return NextResponse.redirect(new URL('/user', request.url));
    }

    // If on home page, redirect based on role
    if (pathname === '/') {
      console.log('Middleware - Home page redirect based on role:', isAdmin ? 'admin' : 'user');
      return NextResponse.redirect(new URL(isAdmin ? '/admin' : '/user', request.url));
    }

    // Allow access to user route for all authenticated users
    if (pathname.startsWith('/user')) {
      console.log('Middleware - Allowing access to user route');
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/:path*', '/user/:path*']
};
