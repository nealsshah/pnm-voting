"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomeServer() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the candidates gallery
    router.push("/candidate");
  }, [router]);

  return null;
} 