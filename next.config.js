/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'i.ytimg.com', 'img.youtube.com'],
  },
}

module.exports = nextConfig

