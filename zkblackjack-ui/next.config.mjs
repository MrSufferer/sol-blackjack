function defineNextConfig(config) {
  return config
}

export default defineNextConfig({
  reactStrictMode: true,
  swcMinify: true,
  
  // Enhanced error handling and debugging
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  // Production debugging enhancements
  productionBrowserSourceMaps: process.env.NODE_ENV === 'production',
  
  webpack: function (config, options) {
    // Disable minification in production for better error messages
    if (process.env.NODE_ENV === 'production' && process.env.DEBUG_PRODUCTION === 'true') {
      config.optimization.minimize = false;
    }
    
    if (!options.isServer) {
      config.resolve.fallback = {
        fs: false,
        readline: false,
        os: false,
        path: false,
        crypto: false,
      }
    }
    
    config.experiments = { 
      asyncWebAssembly: true, 
      layers: true 
    }
    
    return config
  },
  
  // Enhanced TypeScript and ESLint configuration
  typescript: {
    // Only ignore build errors in development
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  
  eslint: {
    // Only ignore during builds in development
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  
  // Experimental features for better error handling
  experimental: {
    // Enable runtime error overlay improvements
    appDir: false,
    // Removed serverComponentsExternalPackages to eliminate warning
  },
  
  // Custom headers for better error tracking
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ]
  },
  
  // Enhanced redirects for error handling
  async redirects() {
    return [
      {
        source: '/error',
        destination: '/404',
        permanent: false,
      },
    ]
  },
  
  // Next.js i18n docs: https://nextjs.org/docs/advanced-features/i18n-routing
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
})
