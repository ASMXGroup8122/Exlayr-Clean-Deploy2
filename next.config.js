/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
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
    webpack: (config, { isServer }) => {
        config.ignoreWarnings = [
            { module: /node_modules\/node-fetch\/lib\/index\.js/ },
            { file: /node_modules\/node-fetch\/lib\/index\.js/ },
        ];
        config.resolve.alias = {
            ...config.resolve.alias,
            '@': require('path').resolve(__dirname, './src'),
        };
        
        // Optimize chunks for more reliable loading - only apply to client builds
        if (!isServer) {
            config.optimization.splitChunks = {
                chunks: 'all',
                cacheGroups: {
                    default: false,
                    vendors: false,
                    // Vendor chunk for node_modules
                    vendor: {
                        name: 'vendor',
                        chunks: 'all',
                        test: /node_modules/,
                        priority: 20,
                    },
                    // Common chunk for shared code
                    common: {
                        name: 'common',
                        minChunks: 2,
                        chunks: 'all',
                        priority: 10,
                        reuseExistingChunk: true,
                        enforce: true,
                    },
                },
            };
        }
        
        // Polyfill `self` for the server build
        if (isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                // Ensure browser globals aren't used in server builds
                'navigator': false,
                'window': false,
                'document': false,
                'localStorage': false,
                'sessionStorage': false,
            };
        }
        
        return config;
    },

    // 1) Skip TypeScript errors
    typescript: {
        ignoreBuildErrors: true,
    },

    // 2) Skip ESLint errors
    eslint: {
        ignoreDuringBuilds: true,
    },
    
    // Disable react-strict mode for production
    reactStrictMode: false,
    
    // Add cache control headers
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
    
    // Handle browser polyfills
    experimental: {
        // Ensure proper isolation of server/client code
    },
    
    // Moved from experimental to root level as per Next.js 15+ requirements
    serverExternalPackages: ['node-fetch', 'openai', '@pinecone-database/pinecone'],
};

module.exports = nextConfig;
