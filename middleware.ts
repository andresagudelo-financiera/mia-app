import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/admin',
  },
  callbacks: {
    authorized: ({ token }) => token?.role === 'admin' && token?.isActive === true,
  },
})

export const config = {
  matcher: ['/admin/usuarios/:path*', '/admin/simuladores/:path*'],
}
