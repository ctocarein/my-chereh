import Link from "next/link";

import RequireAuth from "@/components/auth/RequireAuth";
import RequireGate from "@/components/auth/RequireGate";

export default function ActionPage() {
  return (
    <RequireAuth>
      <RequireGate>
        <div className="page">
          <main className="page__content">
            <h1>Orientation concrete</h1>
            <p>Prochaine etape simple, claire et actionnable.</p>
          </main>
          <div className="page__actions page__content">
            <Link className="btn btn-primary" href="/">
              Revenir a l'accueil
            </Link>
          </div>
        </div>
      </RequireGate>
    </RequireAuth>
  );
}
