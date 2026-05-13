/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["*"] },
  },
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
