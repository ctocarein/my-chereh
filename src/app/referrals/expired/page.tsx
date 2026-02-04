import Link from "next/link";

export default function ReferralExpiredPage() {
  return (
    <div className="page">
      <main className="page__content" style={{ paddingTop: "28px" }}>
        <header className="page-header">
          <div className="page-header__title">Lien d'invitation expire</div>
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
                <path d="M12 4l9 16H3l9-16z" />
                <path d="M12 9v5" />
                <circle cx="12" cy="17" r="1" />
              </svg>
            </span>
            <div>
              <p style={{ marginTop: 0 }}>
                Nous sommes desoles, ce lien partage par votre ambassadrice n'est
                plus actif.
              </p>
              <p style={{ color: "var(--muted)", marginTop: "6px" }}>
                Pour proteger vos donnees de sante, les invitations expirent
                automatiquement apres un certain temps.
              </p>
            </div>
          </div>
          <div style={{ marginTop: "14px" }}>
            <p style={{ fontWeight: 600, marginBottom: "6px" }}>
              Et maintenant ?
            </p>
            <ol style={{ paddingLeft: "18px", color: "var(--muted)" }}>
              <li>Demandez a votre ambassadrice un nouveau lien.</li>
              <li>Si vous avez deja un compte, connectez-vous directement.</li>
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
