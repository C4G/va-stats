/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    localPatterns: [
      { pathname: "/images/**", search: "" },
      { pathname: "/images/**", search: "?v=20251004" },
      { pathname: "/icons/**", search: "" },
      { pathname: "/vercel.svg", search: "" },
    ],
  },
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
