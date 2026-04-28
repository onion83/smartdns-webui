/** @type {import('next').NextConfig} */
const devConfig = {
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://192.168.11.199:6080/api/:path*'
            }
        ];
    }
};

const prodConfig = {
    output: 'export',
};

const config = process.env.NODE_ENV === 'production' ? prodConfig : devConfig;
config.typedRoutes = false;

export default config;