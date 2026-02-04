"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import RequireAuth from "@/components/auth/RequireAuth";
import RequireGate from "@/components/auth/RequireGate";
import { panicLockIdentity } from "@/lib/api/identity";

export default function SecurityPage() {
  const router = useRouter();
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const handlePanicLock = async () => {
    setLockError(null);
    setIsLocking(true);
    try {
      await panicLockIdentity();
      router.replace("/gate");
    } catch {
      setLockError("Impossible d'activer le verrouillage pour le moment.");
    } finally {
      setIsLocking(false);
    }
  };
  return (
    <RequireAuth>
      <RequireGate>
      <div className="page">
        <main className="page__content">
          <header className="page-header">
            <button
              type="button"
              className="page-back"
              onClick={() => router.back()}
              aria-label="Retour"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <div className="page-header__title">Securite</div>
          </header>
          <p>Parametres de securite et appareils connectes.</p>
          {lockError ? (
            <p className="chat-input__error" role="alert">
              {lockError}
            </p>
          ) : null}
          <div className="page__actions page__content">
            <button
              type="button"
              className="btn btn-secondary w-full"
              onClick={handlePanicLock}
              disabled={isLocking}
            >
              {isLocking ? "Verrouillage..." : "Panic lock"}
            </button>
          </div>
        </main>
      </div>
      </RequireGate>
    </RequireAuth>
  );
}
