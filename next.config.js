/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'picsum.photos',
                port: '',
                pathname: '/**',
            },
        ],
    },
    webpack: (config) => {
        config.ignoreWarnings = [
            { module: /node_modules\/node-fetch\/lib\/index\.js/ },
            { file: /node_modules\/node-fetch\/lib\/index\.js/ },
        ];
        config.resolve.alias = {
            ...config.resolve.alias,
            '@': require('path').resolve(__dirname, './src'),
        };
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
};

module.exports = nextConfig;
