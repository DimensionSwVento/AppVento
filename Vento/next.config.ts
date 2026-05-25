import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Carpeta de esta app (donde está node_modules). Evita que Turbopack use el repo padre por otro package-lock.json. */
const turbopackRoot = path.dirname(fileURLToPath(import.meta.url));

// Si NEXT_PUBLIC_API_URL está definido, reenviar APIs de datos al backend FastAPI.
// En desarrollo local (sin la variable) se usan las rutas internas de Next.js.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackRoot,
  },
  reactCompiler: true,
  ...(API_URL && {
    async rewrites() {
      return {
        beforeFiles: [
          // /api/tiles se reenvía directamente al backend FastAPI (tiles son binarios, no tienen fallback)
          {
            source: "/api/tiles/:path*",
            destination: `${API_URL}/api/tiles/:path*`,
          },
          // NOTA: /api/variables NO está aquí — el route handler de Next.js hace el proxy+fallback
        ],
      };
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
