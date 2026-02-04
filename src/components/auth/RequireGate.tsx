"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { getSecurityStatus } from "@/lib/api/identity";
import {
  getDeviceFingerprint,
  isGateLocked,
  isGateRequired,
  readSecurityGate,
  storeSecurityGate,
} from "@/lib/security";

type RequireGateProps = {
  children: ReactNode;
  redirectTo?: string;
};

export default function RequireGate({
  children,
  redirectTo = "/gate",
}: RequireGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let isActive = true;
    const stored = readSecurityGate();
    if (stored && !isGateRequired(stored) && !isGateLocked(stored)) {
      setIsAllowed(true);
    }

    const checkGate = async () => {
      try {
        const gate = await getSecurityStatus(getDeviceFingerprint());
        if (!isActive) {
          return;
        }
        storeSecurityGate(gate);
        if (isGateRequired(gate) || isGateLocked(gate)) {
          router.replace(`${redirectTo}?next=${encodeURIComponent(pathname ?? "/")}`);
          setIsAllowed(false);
          return;
        }
        setIsAllowed(true);
      } catch {
        router.replace(`${redirectTo}?next=${encodeURIComponent(pathname ?? "/")}`);
        setIsAllowed(false);
      } finally {
        if (isActive) {
          setIsChecking(false);
        }
      }
    };

    void checkGate();

    return () => {
      isActive = false;
    };
  }, [redirectTo, router]);

  if (isChecking) {
    return (
      <div className="page__content" style={{ paddingTop: "24px" }}>
        <p style={{ color: "var(--muted)" }}>
          Verification de securite en cours...
        </p>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
