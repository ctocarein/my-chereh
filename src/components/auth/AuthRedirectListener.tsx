"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const unauthenticatedEventName = "chereh:unauthenticated";

export default function AuthRedirectListener() {
  const router = useRouter();

  useEffect(() => {
    const handleUnauthenticated = () => {
      router.replace("/signin");
    };

    window.addEventListener(unauthenticatedEventName, handleUnauthenticated);
    return () => {
      window.removeEventListener(
        unauthenticatedEventName,
        handleUnauthenticated,
      );
    };
  }, [router]);

  return null;
}
