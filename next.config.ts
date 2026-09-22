import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["quickjs-emscripten"],
  async redirects() {
    return [
      { source: "/register", destination: "/signup", permanent: true },
      { source: "/community/question/:id", destination: "/community/:id", permanent: true },
      { source: "/certificate/:code", destination: "/verify/:code", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;