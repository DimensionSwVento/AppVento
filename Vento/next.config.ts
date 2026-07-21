import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Carpeta de esta app (donde está node_modules). Evita que Turbopack use el repo padre por otro package-lock.json. */
const turbopackRoot = path.dirname(fileURLToPath(import.meta.url));

// Toda la API va por el BFF autenticado (rutas Next `/api/tiles/*` y
// `/api/historico`, que reenvían la identidad al FastAPI privado). Ya no se
// usa un rewrite directo — así el backend puede ser privado y todo pasa por auth.

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackRoot,
  },
  reactCompiler: true,
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
