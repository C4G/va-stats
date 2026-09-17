/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

module.exports = withPWA({
  reactStrictMode: true,
  output: "standalone",
  pageExtensions: ["mdx", "md", "tsx", "ts", "svg"],

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
