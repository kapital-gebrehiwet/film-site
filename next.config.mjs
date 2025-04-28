const nextConfig = {
  images: {
      remotePatterns: [
          {
              protocol: 'https',
              hostname: 'lh3.googleusercontent.com',
              port: '',
              pathname: '/**',
          },
          {
              protocol: 'https',
              hostname: 'image.tmdb.org',
              port: '',
              pathname: '/**',
          },
          {
              protocol: 'https',
              hostname: 'avatars.githubusercontent.com',
              port: '',
              pathname: '/**',
          },
      ],
  },
  async headers() {
    return [
      {
        source: '/api/auth/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ]
      }
    ]
  }
};

export default nextConfig;