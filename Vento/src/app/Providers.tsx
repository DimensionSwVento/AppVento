"use client";

import { AprincipalProvider } from "./Utils/AccionPrincipalContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AprincipalProvider>{children}</AprincipalProvider>;
}
