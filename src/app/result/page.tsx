"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import RequireAuth from "@/components/auth/RequireAuth";
import RequireGate from "@/components/auth/RequireGate";

export default function ResultPage() {
  const router = useRouter();
  const [summary, setSummary] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const report = useMemo(
    () => ({
      title: "Rapport d'orientation",
      risk_level: "moderate",
      score: 64,
      recommendation:
        "Planifiez un suivi avec un professionnel de sante et poursuivez la surveillance.",
      date: new Date().toISOString(),
      thematics: ["Depistage", "Antecedents", "Mode de vie"],
    }),
    [],
  );

  const riskLabel =
    report.risk_level === "high"
      ? "Risque eleve"
      : report.risk_level === "moderate"
        ? "Risque modere"
        : "Faible risque";

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
              <p className="result__eyebrow">Resultat</p>
              <h1 className="result__title">{report.title}</h1>
            </div>
          </header>

          <section className="result__card">
            <div className="result__score">
              <div className="result__score-icon" data-risk={report.risk_level}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
                  <path d="M12 7v6" />
                  <circle cx="12" cy="16" r="1" />
                </svg>
              </div>
              <div>
                <p className="result__label">Score global</p>
                <p className="result__score-value">
                  {report.score} / 100
                </p>
              </div>
            </div>
            <p className="result__label">Niveau de risque</p>
            <p className="result__risk" data-risk={report.risk_level}>
              {riskLabel}
            </p>
            <p className="result__label">Recommandation</p>
            <p className="result__value">{report.recommendation}</p>
            <p className="result__label">Date</p>
            <p className="result__meta">
              {new Date(report.date).toLocaleString()}
            </p>
            <p className="result__label">Thematiques concernees</p>
            <div className="result__tags">
              {report.thematics.map((item) => (
                <span key={item} className="result__tag">
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="result__section">
            <p className="result__label">Mon resume / notes personnelles</p>
            {isEditing ? (
              <div className="result__notes">
                <textarea
                  className="result__textarea"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
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
                className={`result__textarea ${
                  summary ? "is-filled" : ""
                }`}
                onClick={() => setIsEditing(true)}
              >
                {summary || "Appuyez pour saisir un resume personnel…"}
              </button>
            )}
          </section>

          <div className="result__actions">
            <button type="button" className="result__action-btn">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v10" />
                <path d="M8 9l4 4 4-4" />
                <path d="M5 21h14" />
              </svg>
              Telecharger
            </button>
            <button type="button" className="result__action-btn">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.6 13.4l6.8 4.2" />
                <path d="M15.4 6.4L8.6 10.6" />
              </svg>
              Partager
            </button>
            <Link className="btn btn-primary" href="/action">
              Voir l'orientation
            </Link>
          </div>
        </main>
      </div>
      </RequireGate>
    </RequireAuth>
  );
}
