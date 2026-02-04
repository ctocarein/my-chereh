"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const authTokenStorageKey = "chereh_auth_token";

type RequireAuthProps = {
  children: ReactNode;
  redirectTo?: string;
};

export default function RequireAuth({
  children,
  redirectTo = "/signin",
}: RequireAuthProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const token = window.localStorage.getItem(authTokenStorageKey);
      if (!token) {
        router.replace(redirectTo);
        return;
      }
      setIsAuthorized(true);
    } catch {
      router.replace(redirectTo);
      return;
    } finally {
      setIsChecking(false);
    }
  }, [router, redirectTo]);

  if (isChecking) {
    return (
      <div className="page__content" style={{ paddingTop: "24px" }}>
        <p style={{ color: "var(--muted)" }}>Verification en cours...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
