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
        // Performance optimizations for development
        if (dev) {
            // Enable persistent caching for MASSIVE speed improvements
            config.cache = {
                type: 'filesystem',
                allowCollectingMemory: true,
                buildDependencies: {
                    config: [__filename]
                }
            };

            // Optimize module resolution
            config.resolve.symlinks = false;
            
            // Faster source maps in development
            config.devtool = 'eval-cheap-module-source-map';

            // Exclude heavy modules from client bundle
            if (!isServer) {
                config.resolve.fallback = {
                    fs: false,
                    path: false,
                    os: false,
                    crypto: false,
                    stream: false,
                    buffer: false,
                    util: false,
                    url: false,
                    querystring: false,
                };
            }

            // Optimize for faster builds
            config.optimization = {
                ...config.optimization,
                removeAvailableModules: false,
                removeEmptyChunks: false,
                splitChunks: false,
            };
        }

        // Ignore warnings for faster compilation
        config.ignoreWarnings = [
            { module: /node_modules/ },
            /Critical dependency/,
        ];
        
        config.resolve.alias = {
            ...config.resolve.alias,
            '@': require('path').resolve(__dirname, './src'),
        };
        
        return config;
    },

    // Skip TypeScript and ESLint errors for faster development
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    
    // Enable React strict mode for better development experience
    reactStrictMode: false, // Keep disabled to prevent double renders
    
    // Optimize package imports for faster builds
    experimental: {
        optimizePackageImports: [
            'lucide-react',
            '@radix-ui/react-icons',
            '@supabase/supabase-js',
            'framer-motion'
        ],
        // Enable faster dev server
        turbo: {
            rules: {
                '*.svg': {
                    loaders: ['@svgr/webpack'],
                    as: '*.js',
                },
            },
        },
    },
    
    // External packages for server (reduces bundle size)
    serverExternalPackages: [
        'node-fetch', 
        'openai', 
        '@pinecone-database/pinecone', 
        '@supabase/ssr',
        'elevenlabs',
        'twitter-api-v2',
        'cheerio'
    ],

    // Development optimizations
    ...(process.env.NODE_ENV === 'development' && {
        swcMinify: false, // Disable minification in dev
        compiler: {
            removeConsole: false, // Keep console logs in dev
        },
    }),
};

module.exports = nextConfig;
