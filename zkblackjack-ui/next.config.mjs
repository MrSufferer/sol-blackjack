import { z } from 'zod'

const server = z.object({
  DATABASE_URL: z.string().url(),
  OPEN_AI_API_KEY: z.string().min(1),
})

const client = z.object({
  NEXT_PUBLIC_CLIENTVAR: z.string().min(1),
})

const processEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  OPEN_AI_API_KEY: process.env.OPEN_AI_API_KEY,
  NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
}

const merged = server.merge(client)

const isServer = typeof window === 'undefined'

if (isServer) {
  const parsed = merged.safeParse(processEnv)

  if (parsed.success === false) {
    console.error(
      '❌ Invalid environment variables:',
      parsed.error.flatten().fieldErrors
    )
    throw new Error('Invalid environment variables')
  }
}

export const env = new Proxy(processEnv, {
  get(target, prop) {
    if (typeof prop !== 'string') return undefined
    if (!isServer && !prop.startsWith('NEXT_PUBLIC_'))
      throw new Error(
        process.env.NODE_ENV === 'production'
          ? '❌ Attempted to access a server-side environment variable on the client'
          : `❌ Attempted to access server-side environment variable '${prop}' on the client`
      )
    return target[prop]
  },
})

/**
 * Don't be scared of the generics here.
 * All they do is to give us autocompletion when using this.
 *
 * @template {import('next').NextConfig} T
 * @param {T} config - A generic parameter that flows through to the return type
 * @constraint {{import('next').NextConfig}}
 */
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
    
    // Add runtime error catching for production
    if (options.isServer === false) {
      config.entry = async () => {
        const entries = await config.entry()
        if (entries['main.js'] && !entries['main.js'].includes('./zkblackjack-ui/error-handler.js')) {
          entries['main.js'].push('./zkblackjack-ui/error-handler.js')
        }
        return entries
      }
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
    serverComponentsExternalPackages: ['@solana/web3.js'],
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
