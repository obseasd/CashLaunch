/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle .cash files and .node files
    config.module.rules.push({
      test: /\.node$/,
      use: "node-loader",
    });

    if (!isServer) {
      // Polyfills for browser environment
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        path: false,
      };
    }

    return config;
  },
  // Transpile ESM packages
  transpilePackages: ["cashscript", "@cashscript/utils", "@bitauth/libauth"],
};

export default nextConfig;
