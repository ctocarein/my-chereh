"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const errorType = useMemo(
    () => (searchParams?.get("type") ?? "").toLowerCase(),
    [searchParams],
  );
  const content = useMemo(() => {
    if (errorType === "network" || errorType === "reseau") {
      return {
        title: "Probleme de connexion",
        intro:
          "Nous n'arrivons pas a joindre le service pour le moment.",
        detail:
          "Verifiez votre connexion internet puis reessayez tranquillement.",
        step1: "Verifier le reseau (Wi‑Fi, donnees mobiles).",
        step2: "Revenir a l'accueil et relancer le parcours.",
      };
    }
    if (errorType === "server" || errorType === "serveur") {
      return {
        title: "Service temporairement indisponible",
        intro:
          "Le service rencontre une difficulte temporaire.",
        detail:
          "Vos donnees restent protegees. Revenez dans quelques minutes.",
        step1: "Revenir a l'accueil puis reessayer plus tard.",
        step2: "Contacter le support si le probleme persiste.",
      };
    }
    return {
      title: "Une erreur s'est produite",
      intro:
        "Nous sommes desoles, une erreur inattendue s'est produite.",
      detail:
        "Votre parcours reste protege. Vous pouvez reessayer ou revenir a l'accueil.",
      step1: "Revenir a l'accueil et relancer le parcours.",
      step2: "Contacter le support si le probleme persiste.",
    };
  }, [errorType]);

  return (
    <div className="page">
      <main className="page__content" style={{ paddingTop: "28px" }}>
        <header className="page-header">
          <div className="page-header__title">{content.title}</div>
        </header>
        <section className="card" style={{ marginTop: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background:
                  "linear-gradient(135deg, rgba(0, 149, 182, 0.18), rgba(71, 198, 191, 0.18))",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--support)",
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
                <path d="M12 7v6" />
                <circle cx="12" cy="16" r="1" />
              </svg>
            </span>
            <div>
              <p style={{ marginTop: 0 }}>
                {content.intro}
              </p>
              <p style={{ color: "var(--muted)", marginTop: "6px" }}>
                {content.detail}
              </p>
            </div>
          </div>
          <div style={{ marginTop: "14px" }}>
            <p style={{ fontWeight: 600, marginBottom: "6px" }}>
              Que faire maintenant ?
            </p>
            <ol style={{ paddingLeft: "18px", color: "var(--muted)" }}>
              <li>{content.step1}</li>
              <li>{content.step2}</li>
            </ol>
          </div>
        </section>
      </main>
      <div className="page__actions page__content" style={{ marginTop: "18px" }}>
        <Link className="btn btn-primary w-full" href="/">
          Revenir a l'accueil
        </Link>
        <Link className="btn btn-secondary w-full" href="/support">
          Contacter le support
        </Link>
      </div>
    </div>
  );
}
