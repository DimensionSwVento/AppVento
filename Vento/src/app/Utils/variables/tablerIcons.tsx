/**
 * Conjunto reducido de íconos estilo Tabler dibujados inline.
 *
 * Razón: el catálogo (Figura 3 del cliente) referencia 7 conceptos para los
 * que Lucide no tiene equivalente fiel y Tabler sí: butterfly, volcano,
 * windmill, road, bomb, polygon, tent. En vez de instalar `@tabler/icons-react`
 * (otra dependencia + bundle extra) re-dibujamos las 7 con su mismo estilo
 * (grid 24×24, trazo 2 redondeado) para que mezclen con Lucide sin notarse.
 *
 * Si en el futuro se necesitan más íconos de Tabler conviene cambiar a
 * `@tabler/icons-react` y borrar este archivo.
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

export const Butterfly = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14" />
    <path d="M12 9C10.5 5.4 5.8 5 4.4 7.6S4 13 6 14.6 11 15 12 12.8" />
    <path d="M12 9c1.5-3.6 6.2-4 7.6-1.4S20 13 18 14.6 13 15 12 12.8" />
    <path d="M12 6l-1.4-1.4M12 6l1.4-1.4" />
  </Icon>
);

export const Volcano = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 20h18" />
    <path d="M7.4 20 11 12h2l3.6 8" />
    <path d="M11 12l1-3.4 1 3.4" />
    <path d="M12 8.6V5M9.6 6.6 8.6 4.4M14.4 6.6l1-2.2" />
  </Icon>
);

export const Windmill = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="10" r="1" />
    <path d="M12 10V3.5" />
    <path d="M12 10 6 13.4" />
    <path d="M12 10 18 13.4" />
    <path d="M12 11v9.5" />
    <path d="M9.6 20.5h4.8" />
  </Icon>
);

export const Road = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8.4 21 6.4 3M15.6 21l2-18" />
    <path d="M12 5.6v2.6M12 11v2.6M12 16.4V19" />
  </Icon>
);

export const Bomb = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="14" r="7" />
    <path d="M16 9l3-3" />
    <path d="M17 5l1 1 2-1 1 1" />
  </Icon>
);

export const Polygon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7.5 10 4l7.5 2 3 6-4 6.5-8.5 1L4 14z" />
    <circle cx="11" cy="11" r="1.1" />
  </Icon>
);

export const Tent = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20a8 8 0 0 1 16 0" />
    <path d="M12 4 4 20M12 4l8 16" />
    <path d="M12 4V7" />
    <path d="M3 20h18" />
  </Icon>
);

export const TABLER_ICONS = {
  butterfly: Butterfly,
  volcano: Volcano,
  windmill: Windmill,
  road: Road,
  bomb: Bomb,
  polygon: Polygon,
  tent: Tent,
} as const;

export type TablerIconKey = keyof typeof TABLER_ICONS;
