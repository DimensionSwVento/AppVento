import type { NextConfig } from "next";

// Si NEXT_PUBLIC_API_URL está definido, reenviar /api/tiles/* al backend FastAPI.
// En desarrollo local (sin la variable) se usan las rutas internas de Next.js.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(API_URL && {
    async rewrites() {
      return [
        {
          source: "/api/tiles/:path*",
          destination: `${API_URL}/api/tiles/:path*`,
        },
      ];
    },
  }),
  transpilePackages: [
    "deck.gl",
    "@deck.gl/core",
    "@deck.gl/react",
    "@deck.gl/layers",
    "@deck.gl/geo-layers",
    "@luma.gl/core",
    "@luma.gl/engine",
    "@luma.gl/webgl",
    "@luma.gl/shadertools",
  ],
};

export default nextConfig;
