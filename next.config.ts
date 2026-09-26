import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `typescript` is a large CommonJS compiler used only for server-side type
  // erasure. Keeping it external avoids bundling it into the server output.
  serverExternalPackages: ["quickjs-emscripten", "typescript"],
  // The repo lives inside a parent folder that also holds other projects.
  // Without this, Next.js walks up and warns that it ignored the outer
  // package-lock.json. Pin the root to this project directory.
  turbopack: { root: __dirname },
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