/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Désactiver les rewrites pour éviter que Next.js intercepte les routes /api/*
  async rewrites() {
    return [];
  },
}

module.exports = nextConfig
