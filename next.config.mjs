/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["*"] },
  },
  // yahoo-finance2's package ships test files that import deno/std modules;
  // keep it external (Node will resolve the package at runtime, webpack
  // won't try to bundle the test paths).
  serverExternalPackages: ["yahoo-finance2"],
  async headers() {
    return [
      {
        source: "/v2/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, APCA-API-KEY-ID, APCA-API-SECRET-KEY, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
