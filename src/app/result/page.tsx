"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import RequireAuth from "@/components/auth/RequireAuth";
import RequireGate from "@/components/auth/RequireGate";
import { getEvaluationState } from "@/lib/api/evaluations";
import type {
  EvaluationInsight,
  EvaluationReport,
  EvaluationSession,
} from "@/lib/api/types";

const flowStorageKey = "evaluation-flow-v1";

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
      return "Non déterminé";
  }
}

export default function ResultPage() {
  const router = useRouter();
  const [session, setSession] = useState<EvaluationSession | null>(null);
  const [insight, setInsight] = useState<EvaluationInsight | null>(null);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = window.localStorage.getItem(flowStorageKey);
        const stored = raw
          ? (JSON.parse(raw) as Record<string, unknown>)
          : null;
        const sessionId =
          (stored?.sessionPublicId as string | undefined) ??
          (stored?.sessionId as string | undefined);

        if (!sessionId) {
          setError("Aucune session récente trouvée.");
          setLoading(false);
          return;
        }

        const data = await getEvaluationState(sessionId);
        setSession(data.session ?? null);
        setInsight(data.insight ?? null);
        setReport(data.report ?? null);
      } catch {
        setError("Impossible de charger le résultat.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const riskLevel = session?.risk_level ?? insight?.risk_level;
  const score = session?.score;
  const maxScore = report?.max_score;
  const recommendation = report?.recommendation ?? insight?.suggested_action;
  const specialties = report?.specialties;
  const reportTitle = (report as Record<string, unknown> | null)
    ?.title as string | null | undefined;
  const date = session?.completed_at ?? session?.started_at;

  return (
    <RequireAuth>
      <RequireGate>
        <div className="page page--result">
          <main className="page__content result">
            <header className="result__header">
              <button
                type="button"
                className="result__back"
                onClick={() => router.back()}
                aria-label="Retour"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <div>
                <p className="result__eyebrow">Résultat</p>
                <h1 className="result__title">
                  {reportTitle ?? "Rapport d'orientation"}
                </h1>
              </div>
            </header>

            {loading && (
              <p className="result__loading">Chargement en cours…</p>
            )}

            {error && <p className="result__error">{error}</p>}

            {!loading && !error && (
              <>
                <section className="result__card">
                  <div className="result__score">
                    <div className="result__score-icon" data-risk={riskLevel}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
                        <path d="M12 7v6" />
                        <circle cx="12" cy="16" r="1" />
                      </svg>
                    </div>
                    <div>
                      <p className="result__label">Score global</p>
                      <p className="result__score-value">
                        {score != null
                          ? `${score}${maxScore != null ? ` / ${maxScore}` : ""}`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <p className="result__label">Niveau de risque</p>
                  <p className="result__risk" data-risk={riskLevel}>
                    {getRiskLabel(riskLevel)}
                  </p>

                  {recommendation && (
                    <>
                      <p className="result__label">Recommandation</p>
                      <p className="result__value">{recommendation}</p>
                    </>
                  )}

                  {date && (
                    <>
                      <p className="result__label">Date</p>
                      <p className="result__meta">
                        {new Date(date).toLocaleString("fr-FR")}
                      </p>
                    </>
                  )}

                  {specialties && specialties.length > 0 && (
                    <>
                      <p className="result__label">Thématiques concernées</p>
                      <div className="result__tags">
                        {specialties.map((item) => (
                          <span key={item} className="result__tag">
                            {item}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  {insight?.confidence_score != null && (
                    <>
                      <p className="result__label">Indice de confiance</p>
                      <p className="result__meta">
                        {Math.round(insight.confidence_score * 100)}&nbsp;%
                      </p>
                    </>
                  )}
                </section>

                <section className="result__section">
                  <p className="result__label">Mes notes personnelles</p>
                  {isEditing ? (
                    <div className="result__notes">
                      <textarea
                        className="result__textarea"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Exprimez votre ressenti, vos questions, etc."
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn result__save"
                        onClick={() => setIsEditing(false)}
                      >
                        Enregistrer
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`result__textarea ${notes ? "is-filled" : ""}`}
                      onClick={() => setIsEditing(true)}
                    >
                      {notes || "Appuyez pour saisir un résumé personnel…"}
                    </button>
                  )}
                </section>

                <div className="result__actions">
                  <Link className="btn btn-primary" href="/action">
                    Voir l&apos;orientation
                  </Link>
                  <Link className="btn" href="/reports">
                    Mes rapports
                  </Link>
                </div>
              </>
            )}
          </main>
        </div>
      </RequireGate>
    </RequireAuth>
  );
}
