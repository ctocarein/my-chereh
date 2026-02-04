"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import RequireAuth from "@/components/auth/RequireAuth";

export default function GateSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextHref = useMemo(() => {
    const next = searchParams?.get("next");
    return next && next.startsWith("/") ? next : "/profile";
  }, [searchParams]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.replace(nextHref);
    }, 1200);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [nextHref, router]);

  return (
    <RequireAuth>
      <div className="page">
        <main className="page__content">
          <header className="page-header">
            <div className="page-header__title">Acces deverrouille</div>
          </header>
          <p style={{ color: "var(--muted)" }}>
            Vos donnees de sante sont maintenant accessibles.
          </p>
          <div className="page__actions page__content">
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => router.replace(nextHref)}
            >
              Continuer
            </button>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
