/**
 * SVGs propios para variables sin equivalente fiel en Lucide ni Tabler.
 * Estilo idéntico (24×24, fill=none, currentColor, strokeWidth=2 redondeado)
 * para que mezclen con los otros íconos sin notarse.
 *
 * Paths originales tomados del mockup HTML del cliente (Figura 3).
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number | string;
};

function Icon({
  children,
  size = 24,
  strokeWidth = 2,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Aves en V (especies migratorias). */
export const BirdsV = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 10c1.1-1.6 2.5-1.6 3.6 0 1.1-1.6 2.5-1.6 3.6 0" />
    <path d="M13.8 14c1.1-1.6 2.5-1.6 3.6 0 1.1-1.6 2.5-1.6 3.6 0" />
  </Icon>
);

/** Tres aves (congregación de aves playeras). */
export const Birds3 = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12c.8-1.2 2-1.2 2.8 0 .8-1.2 2-1.2 2.8 0" />
    <path d="M15.4 9c.8-1.2 2-1.2 2.8 0 .8-1.2 2-1.2 2.8 0" />
    <path d="M9.2 16c.8-1.2 2-1.2 2.8 0 .8-1.2 2-1.2 2.8 0" />
  </Icon>
);

/** Pastos marinos. */
export const Seagrass = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 21h16" />
    <path d="M8 21c-2-3-2-7 1-11" />
    <path d="M12 21c-1-4 0-9 2-12" />
    <path d="M16 21c2-3 1-7-1-10" />
  </Icon>
);

/** Nido con huevos (zonas de reproducción de aves). */
export const Nest = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 14c0 3.6 4 5.4 9 5.4s9-1.8 9-5.4" />
    <path d="M3.4 13.4c1.4-1 3-1 4.4 0M16.2 13.4c1.4-1 3-1 4.4 0" />
    <ellipse cx="10" cy="12.4" rx="1.6" ry="2" />
    <ellipse cx="14" cy="12.4" rx="1.6" ry="2" />
  </Icon>
);

/** Espadañas (humedales RAMSAR). */
export const Cattails = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 21h16" />
    <path d="M9 21V7" />
    <rect x="7.4" y="3.4" width="3.2" height="5" rx="1.6" />
    <path d="M9 12l3-2.6M9 14.4l3-2.6" />
    <path d="M15.5 21V10" />
    <rect x="14" y="6.4" width="3" height="4.4" rx="1.5" />
  </Icon>
);

/** Coral (mares coralinos). */
export const Coral = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21v-6" />
    <path d="M12 15c-1.2-1-2.4-2-2.4-4.2S8.4 7 7.2 5.8" />
    <path d="M12 13.6c1.1-1 2.2-1 2.2-3.2s1.1-2.2 2.2-3.2" />
    <path d="M12 17.4c-1.6-1.2-4.2-1-4.2 1.2" />
    <path d="M12 17.4c1.6-1.2 4.2-1 4.2 1.2" />
  </Icon>
);

/** Pendiente del terreno. */
export const Slope = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h16" />
    <path d="M4 20 18 7" />
    <path d="M18 7v13" />
    <path d="M8.2 16.5h3.4M8.2 16.5v-3" />
  </Icon>
);

/** Nido con ave perchada encima (zonas de reproducción de aves). */
export const NestBird = (p: IconProps) => (
  <Icon {...p}>
    {/* Ave estilizada en la parte superior */}
    <path d="M10 7c.5-1.6 2-1.6 2.6 0" />
    <path d="M12.6 7c.6-1.2 1.8-1.4 2.6-.6" />
    <circle cx="14.6" cy="6.2" r="0.5" fill="currentColor" stroke="none" />
    <path d="M15.2 6.4 17 6" />
    <path d="M10.4 7.6l-.6 2" />
    {/* Nido en la parte inferior */}
    <path d="M3 16c0 3.2 3.6 4.6 9 4.6s9-1.4 9-4.6" />
    <path d="M3.4 15.4c1.4-1 3-1 4.4 0M16.2 15.4c1.4-1 3-1 4.4 0" />
    <ellipse cx="9.6" cy="14.4" rx="1.4" ry="1.7" />
    <ellipse cx="14.4" cy="14.4" rx="1.4" ry="1.7" />
  </Icon>
);

export const CUSTOM_ICONS = {
  birdsV: BirdsV,
  birds3: Birds3,
  seagrass: Seagrass,
  nest: Nest,
  cattails: Cattails,
  coral: Coral,
  slope: Slope,
  nestBird: NestBird,
} as const;

export type CustomIconKey = keyof typeof CUSTOM_ICONS;
