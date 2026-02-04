"use client";

import { useRouter } from "next/navigation";

import RequireAuth from "@/components/auth/RequireAuth";

export default function HelpPage() {
  const router = useRouter();
  return (
    <RequireAuth>
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
            <div className="page-header__title">Aide & FAQ</div>
          </header>
          <p>Questions frequentes et assistance.</p>
        </main>
      </div>
    </RequireAuth>
  );
}
