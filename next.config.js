/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

module.exports = withPWA({
  reactStrictMode: true,
  output: "standalone",
  pageExtensions: ["mdx", "md", "jsx", "js", "tsx", "ts", "svg"],

  /**
   * mysql2 uses dynamic requires; bundling it for API routes can fail with
   * `Cannot find module './chunks/undefined'`. Load it from node_modules at runtime.
   */
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("mysql2", "mysql2/promise");
    }
    return config;
  },

  async headers() {
    return [
      {
        // turn off cache for specific pages: /studentregistration sub-paths
        source: "/studentregistration/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
});
