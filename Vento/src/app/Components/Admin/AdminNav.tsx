"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/users", label: "Usuarios y roles" },
  { href: "/admin/variables", label: "Variables y datasets" },
  { href: "/admin/normativa", label: "Normativa regulatoria" },
  { href: "/admin/escenarios", label: "Escenarios económicos" },
  { href: "/admin/master", label: "Actualizar master" },
  { href: "/admin/sources", label: "Fuentes de datos" },
];

/** Navegación entre las secciones de administración (US08). */
export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-[#165170ff] text-[#165170ff]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
