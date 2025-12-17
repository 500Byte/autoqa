/** @type {import('next').NextConfig} */
const nextConfig = {
    // Don't use static export because we need API routes
    images: {
        unoptimized: true,
    },
    webpack: (config, { dev }) => {
        // Disable minification for debug builds to catch "t is not defined" errors
        const isDebugBuild = process.env.DEBUG_BUILD === 'true';
        if (isDebugBuild && !dev) {
            console.log('⚠️  DEBUG BUILD ENABLED: Minification Disabled');
            config.optimization.minimize = false;
        }

        // Force axe.min.js to be treated as a raw source string to avoid minification corruption
        config.module.rules.push({
            test: /axe\.min\.js$/,
            type: 'asset/source',
        });

        return config;
    },
};

export default nextConfig;
