"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import RequireAuth from "@/components/auth/RequireAuth";
import RequireGate from "@/components/auth/RequireGate";
import { listReports } from "@/lib/api/reports";
import type { Report } from "@/lib/api/types";

function getRiskLabel(level: string | null | undefined): string {
  switch (level) {
    case "high":
      return "Risque élevé";
    case "very_high":
      return "Risque très élevé";
    case "moderate":
      return "Risque modéré";
    case "low":
      return "Faible risque";
    default:
      return level ?? "—";
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listReports();
        setReports(data);
      } catch {
        setError("Impossible de charger les rapports.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <RequireAuth>
      <RequireGate>
        <div className="page">
          <main className="page__content">
            <header className="page-header">
              <div className="page-header__title">Mes rapports</div>
            </header>

            {loading && <p>Chargement en cours…</p>}

            {error && <p className="result__error">{error}</p>}

            {!loading && !error && reports.length === 0 && (
              <p>Aucun rapport disponible pour le moment.</p>
            )}

            {!loading && !error && reports.length > 0 && (
              <div className="reports-list">
                {reports.map((report) => (
                  <div key={report.id} className="card">
                    <div className="card__body">
                      <p className="card__title">
                        {(report as Record<string, unknown>).title as string ||
                          "Rapport d'évaluation"}
                      </p>
                      {report.risk_level && (
                        <p
                          className="result__risk"
                          data-risk={report.risk_level}
                          style={{ marginBottom: "0.25rem" }}
                        >
                          {getRiskLabel(report.risk_level)}
                        </p>
                      )}
                      {report.score != null && (
                        <p className="result__meta">
                          Score&nbsp;: {report.score}
                          {report.max_score != null
                            ? ` / ${report.max_score}`
                            : ""}
                        </p>
                      )}
                      {report.created_at && (
                        <p className="result__meta">
                          {new Date(report.created_at).toLocaleDateString(
                            "fr-FR",
                          )}
                        </p>
                      )}
                    </div>
                    <Link
                      className="profile-pill"
                      href={`/reports/${report.id}`}
                    >
                      Ouvrir le rapport
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </RequireGate>
    </RequireAuth>
  );
}
