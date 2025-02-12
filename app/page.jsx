"use client";

import { useEffect, useState } from "react";
import { useAuth, AuthProvider } from "./auth/auth-context";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { motion } from "framer-motion";

function Home() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(true);
      router.push("/login");
      return;
    } else {
      setIsLoading(true);
      router.push("/home");
    }
  }, [user, isAdmin, router]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center justify-center min-h-screen"
      >
        <Spinner size="large" className="text-primary" />
      </motion.div>
    );
  }

  return null;
}

export default function HomeWrapper() {
  return (
    <AuthProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Home />
      </motion.div>
    </AuthProvider>
  );
}
