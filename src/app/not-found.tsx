import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <main className="page__content">
        <h1>Page introuvable</h1>
        <p>Le lien ne correspond pas a une etape du parcours.</p>
      </main>
      <div className="page__actions page__content">
        <Link className="btn btn-primary" href="/">
          Retour a l'accueil
        </Link>
      </div>
    </div>
  );
}
