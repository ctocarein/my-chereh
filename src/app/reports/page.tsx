"use client";

import Link from "next/link";

import RequireAuth from "@/components/auth/RequireAuth";
import RequireGate from "@/components/auth/RequireGate";

export default function ReportsPage() {
  return (
    <RequireAuth>
      <RequireGate>
        <div className="page">
          <main className="page__content">
            <header className="page-header">
              <div className="page-header__title">Historique des rapports</div>
            </header>
            <p>Liste des rapports d'evaluation disponibles.</p>
            <div className="card">
              <p>Exemple: Rapport du 27/01/2026</p>
              <Link className="profile-pill" href="/reports/1">
                Ouvrir le rapport
              </Link>
            </div>
          </main>
        </div>
      </RequireGate>
    </RequireAuth>
  );
}
