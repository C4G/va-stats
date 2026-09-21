/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    useTypeScriptCli: false,
  },
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
};
