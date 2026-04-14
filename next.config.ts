import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  trailingSlash: false,
  async redirects() {
    return [
      // www → non-www redirect
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.opticrank.com" }],
        destination: "https://opticrank.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
