/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse']
  },
  webpack: (config, { dev }) => {
    // Evita módulos/chunks stale en desarrollo cuando se alterna entre proyectos Next
    // o cuando el dev server queda vivo mientras se instala/cambia NextAuth.
    if (dev) {
      config.cache = false
    }
    return config
  },
}

module.exports = nextConfig
