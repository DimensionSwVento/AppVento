import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session) redirect("/");
  if (!session.roles?.includes("admin")) redirect("/not-authorized");
  return <>{children}</>;
}
