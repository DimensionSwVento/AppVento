import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { ReactNode } from "react";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await auth();
  if (!session) redirect("/");
  return <>{children}</>;
}
