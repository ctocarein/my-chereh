"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import RequireAuth from "@/components/auth/RequireAuth";
import RequireGate from "@/components/auth/RequireGate";
import { getReport } from "@/lib/api/reports";
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

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const data = await getReport(id);
        setReport(data);
      } catch {
        setError("Rapport introuvable ou accès refusé.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const reportTitle = (report as Record<string, unknown> | null)
    ?.title as string | null | undefined;
  const summary = report?.summary;
  const specialties = report?.specialties;
  const recommendation = report?.recommendation;

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
              <div className="page-header__title">
                {reportTitle ?? "Rapport d'évaluation"}
              </div>
            </header>

            {loading && <p>Chargement en cours…</p>}

            {error && <p className="result__error">{error}</p>}

            {!loading && !error && report && (
              <div className="result">
                <section className="result__card">
                  {report.risk_level && (
                    <>
                      <p className="result__label">Niveau de risque</p>
                      <p
                        className="result__risk"
                        data-risk={report.risk_level}
                      >
                        {getRiskLabel(report.risk_level)}
                      </p>
                    </>
                  )}

                  {report.score != null && (
                    <>
                      <p className="result__label">Score</p>
                      <p className="result__score-value">
                        {report.score}
                        {report.max_score != null
                          ? ` / ${report.max_score}`
                          : ""}
                      </p>
                    </>
                  )}

                  {recommendation && (
                    <>
                      <p className="result__label">Recommandation</p>
                      <p className="result__value">{recommendation}</p>
                    </>
                  )}

                  {report.created_at && (
                    <>
                      <p className="result__label">Date</p>
                      <p className="result__meta">
                        {new Date(report.created_at).toLocaleString("fr-FR")}
                      </p>
                    </>
                  )}

                  {specialties && specialties.length > 0 && (
                    <>
                      <p className="result__label">Thématiques</p>
                      <div className="result__tags">
                        {specialties.map((item) => (
                          <span key={item} className="result__tag">
                            {item}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  {report.report_code && (
                    <>
                      <p className="result__label">Code rapport</p>
                      <p className="result__meta">{report.report_code}</p>
                    </>
                  )}
                </section>

                {summary != null && (
                  <section className="result__section">
                    <p className="result__label">Résumé</p>
                    {Array.isArray(summary) ? (
                      <ul>
                        {(summary as string[]).map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="result__value">{String(summary)}</p>
                    )}
                  </section>
                )}
              </div>
            )}
          </main>
        </div>
      </RequireGate>
    </RequireAuth>
  );
}
