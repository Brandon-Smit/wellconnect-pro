/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Remove deprecated options
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost', 'wellconnect-pro.vercel.app']
    }
  },

  // Environment configuration
  env: {
    VERCEL_ENV: process.env.VERCEL_ENV || 'development',
    NEXT_PUBLIC_APP_VERSION: '1.0.0'
  },

  // Webpack configuration for custom module resolution
  webpack: (config, { isServer }) => {
    // Add aliases for easier imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/components': `${__dirname}/src/components`,
      '@/lib': `${__dirname}/src/lib`,
      '@/services': `${__dirname}/src/services`,
      '@/agents': `${__dirname}/src/agents`
    };

    // Server-side specific configurations
    if (isServer) {
      config.resolve.fallback = { 
        ...config.resolve.fallback, 
        fs: false  // Disable server-side filesystem
      };
    }

    return config;
  },

  // Redirects and rewrites for API and service routing
  async redirects() {
    return [
      // Add any custom redirects here
    ];
  },

  // CORS and security headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' }
        ]
      }
    ];
  },

  // Performance and build optimizations
  productionBrowserSourceMaps: false,
  compress: true
};

module.exports = nextConfig;
