"use client";

import { useAuth, AuthProvider } from "../auth/auth-context";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { CalendarRange, Users, MessageSquare, LayoutDashboard, Timer } from 'lucide-react';

function AdminLayoutContent({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (loading || (user && !isAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isActive = (path) => {
    if (path === '/admin' && pathname === '/admin') {
      return true;
    }
    if (path !== '/admin' && pathname.startsWith(path)) {
      return true;
    }
    return false;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold mr-8">Admin Dashboard</h1>
              <div className="flex space-x-4">
                <Link 
                  href="/admin" 
                  className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/admin') 
                      ? 'border-indigo-500 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  Overview
                </Link>
                
                
                <Link 
                  href="/admin/rounds" 
                  className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/admin/rounds') 
                      ? 'border-indigo-500 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Timer className="h-4 w-4 mr-1" />
                  Rounds
                </Link>
                
                <Link 
                  href="/admin/pnms" 
                  className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/admin/pnms') 
                      ? 'border-indigo-500 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="h-4 w-4 mr-1" />
                  PNMs
                </Link>
                
                <Link 
                  href="/admin/comments" 
                  className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/admin/comments') 
                      ? 'border-indigo-500 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Comments
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <AuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthProvider>
  );
} 