This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```


Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Librerías de Visualización Geoespaciales

Vento renderiza entre 4.500 y 31.000 hexágonos H3 sobre el mapa de Colombia con un mapa de calor interactivo por variables de viabilidad eólica. Para esto se usa **deck.gl** como motor de renderizado WebGL — permite escalar a resoluciones H3 más altas en el futuro sin cambiar de stack. **react-map-gl** con **maplibre-gl** provee el mapa base (tiles de Colombia) sin necesidad de API key. **h3-js** se usa en cliente para convertir coordenadas geográficas a índices H3 y calcular geometrías de hexágonos.

### Instalación

```bash
# Motor de renderizado WebGL — H3HexagonLayer, HeatmapLayer
npm install deck.gl @deck.gl/react @deck.gl/geo-layers @deck.gl/layers

# Mapa base — tiles OpenStreetMap, sin API key requerida
npm install react-map-gl maplibre-gl

# Cálculos H3 en cliente — coords ↔ h3index, geometría hexágonos
npm install h3-js
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# test
