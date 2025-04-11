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
};

export default nextConfig;