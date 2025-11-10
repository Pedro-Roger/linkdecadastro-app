import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    
    // Se o usuário precisa completar o perfil e não está na página de completar perfil
    if (token?.needsProfileCompletion && !req.nextUrl.pathname.startsWith('/complete-profile')) {
      return NextResponse.redirect(new URL('/complete-profile', req.url))
    }
    
    // Se o usuário não precisa completar o perfil e está na página de completar perfil, redirecionar
    if (!token?.needsProfileCompletion && req.nextUrl.pathname.startsWith('/complete-profile')) {
      const redirectUrl = token?.role === 'ADMIN' ? '/admin/dashboard' : '/my-courses'
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Permitir acesso a páginas públicas
        const publicPaths = ['/login', '/register', '/', '/courses', '/api']
        if (publicPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
          return true
        }
        
        // Requer autenticação para outras páginas
        return !!token
      }
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

