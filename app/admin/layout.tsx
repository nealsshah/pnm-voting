"use client";

import { useAuth, AuthProvider } from "../auth/auth-context";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  if (loading || (user && !isAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden lg:block w-64 border-r" />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthProvider>
  );
} 