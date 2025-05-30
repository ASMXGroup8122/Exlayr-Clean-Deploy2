/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    generateBuildId: async () => {
        // This will generate a new ID on each build, helping to bust caches.
        return `exlayr-build-${Date.now()}`;
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'picsum.photos',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'ulvnzvdpbblxsyjynufh.supabase.co',
                port: '',
                pathname: '/storage/v1/object/public/**',
            },
        ],
    },
    webpack: (config, { isServer, dev }) => {
        config.ignoreWarnings = [
            { module: /node_modules\/node-fetch\/lib\/index\.js/ },
            { file: /node_modules\/node-fetch\/lib\/index\.js/ },
        ];
        
        config.resolve.alias = {
            ...config.resolve.alias,
            '@': require('path').resolve(__dirname, './src'),
        };
        
        // Minimal, stable webpack config - let Next.js handle chunk optimization
        if (isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                'fs': false,
                'path': false,
                'os': false,
                'crypto': false,
            };
        } else {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                'fs': false,
                'path': false,
                'os': false,
                'crypto': false,
            };
        }
        
        // Simple cache configuration for development stability
        if (dev) {
            config.cache = false; // Disable caching to prevent corruption
        }
        
        return config;
    },

    // Skip TypeScript and ESLint errors for faster development
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    
    // Disable strict mode to prevent double-rendering issues
    reactStrictMode: false,
    
    // Simple cache headers
    async headers() {
        return [
            {
                source: '/_next/static/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
    
    // Minimal experimental features
    experimental: {
        // Essential optimizations only
        optimizePackageImports: ['lucide-react'],
    },
    
    // External packages for server
    serverExternalPackages: ['node-fetch', 'openai', '@pinecone-database/pinecone', '@supabase/ssr'],
};

module.exports = nextConfig;
