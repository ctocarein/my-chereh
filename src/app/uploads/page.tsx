"use client";

import RequireAuth from "@/components/auth/RequireAuth";
import RequireGate from "@/components/auth/RequireGate";

export default function UploadsPage() {
  return (
    <RequireAuth>
      <RequireGate>
        <div className="page">
          <main className="page__content">
            <header className="page-header">
              <div className="page-header__title">Documents</div>
            </header>
            <p>Gerer vos fichiers et televersements.</p>
          </main>
        </div>
      </RequireGate>
    </RequireAuth>
  );
}
