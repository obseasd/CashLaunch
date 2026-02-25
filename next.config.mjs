/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle .node files
    config.module.rules.push({
      test: /\.node$/,
      use: "node-loader",
    });

    if (!isServer) {
      // Polyfills for browser environment (mainnet-js + cashscript)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
        assert: false,
        buffer: false,
        process: false,
        util: false,
        events: false,
      };
    }

    return config;
  },
  // Transpile ESM packages
  transpilePackages: ["cashscript", "@cashscript/utils", "@bitauth/libauth", "mainnet-js"],
};

export default nextConfig;
