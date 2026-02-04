import Link from "next/link";

export default function ReferralUsedPage() {
  return (
    <div className="page">
      <main className="page__content" style={{ paddingTop: "28px" }}>
        <header className="page-header">
          <div className="page-header__title">Lien deja utilise</div>
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
                Ce lien d'invitation a deja ete utilise sur cet appareil.
              </p>
              <p style={{ color: "var(--muted)", marginTop: "6px" }}>
                Pour proteger les informations de sante, un lien ne peut etre
                utilise qu'une seule fois.
              </p>
            </div>
          </div>
          <div style={{ marginTop: "14px" }}>
            <p style={{ fontWeight: 600, marginBottom: "6px" }}>
              Que pouvez-vous faire ?
            </p>
            <ol style={{ paddingLeft: "18px", color: "var(--muted)" }}>
              <li>Connectez-vous si vous avez deja un compte.</li>
              <li>Sinon, demandez un nouveau lien a votre ambassadrice.</li>
            </ol>
          </div>
        </section>
        <div className="page__actions page__content" style={{ marginTop: "18px" }}>
          <Link className="btn btn-primary w-full" href="/signin">
            Se connecter
          </Link>
          <Link className="btn btn-secondary w-full" href="/support">
            Contacter le support
          </Link>
          <Link className="profile-pill" href="/">
            Retour a l'accueil
          </Link>
        </div>
      </main>
    </div>
  );
}
