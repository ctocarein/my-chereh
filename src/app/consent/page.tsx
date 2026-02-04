"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ConsentPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasConsent = window.localStorage.getItem("chereh_consent_v1") === "1";
    const hasAuthToken =
      !!window.localStorage.getItem("chereh_auth_token")?.trim();
    if (hasAuthToken) {
      router.replace("/profile");
      return;
    }
    if (hasConsent) {
      router.replace("/signin");
    }
  }, [router]);

  const handleAccept = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chereh_consent_v1", "1");
    }
    router.push("/signin");
  };

  return (
    <div className="page">
      <main className="page__content">
        <header style={{ marginTop: "24px" }}>
          <p style={{ color: "var(--muted)", marginBottom: "8px" }}>
            Version 2.0 – Côte d’Ivoire · En vigueur le 9 juillet 2024
          </p>
          <h1>Politique de protection des données personnelles – CHEREH</h1>
          <p style={{ marginTop: "8px" }}>
            Cette politique explique, de façon claire, comment CHEREH collecte,
            utilise et protège vos données personnelles. Prenez le temps de la
            lire avant de poursuivre.
          </p>
        </header>

        <section className="card" style={{ marginTop: "20px" }}>
          <h2>En bref</h2>
          <ul style={{ marginTop: "10px", paddingLeft: "18px" }}>
            <li>Les données de santé sont traitées uniquement avec votre consentement explicite.</li>
            <li>Vous pouvez retirer votre consentement à tout moment.</li>
            <li>Vos droits d’accès, rectification et effacement sont garantis.</li>
            <li>Aucun partage avec des tiers, sauf obligation légale.</li>
          </ul>
        </section>

        <nav className="card" style={{ marginTop: "16px" }} aria-label="Sommaire">
          <h2>Sommaire</h2>
          <ol style={{ marginTop: "10px", paddingLeft: "18px" }}>
            <li><a href="#introduction">Introduction</a></li>
            <li><a href="#responsable">Responsable de traitement</a></li>
            <li><a href="#dpd">Délégué à la protection des données</a></li>
            <li><a href="#traitements">Catégories de traitements</a></li>
            <li><a href="#retrait">Retrait du consentement</a></li>
            <li><a href="#refus">Conséquences du refus</a></li>
            <li><a href="#partage">Partage des données</a></li>
            <li><a href="#transferts">Transferts internationaux</a></li>
            <li><a href="#droits">Droits des utilisateurs</a></li>
            <li><a href="#securite">Mesures de sécurité</a></li>
            <li><a href="#validite">Validité et modifications</a></li>
          </ol>
        </nav>

        <section id="introduction" style={{ marginTop: "24px" }}>
          <h2>1. Introduction</h2>
          <p style={{ marginTop: "8px" }}>
            La présente politique de protection des données personnelles décrit
            la manière dont la plateforme <strong>CHEREH</strong> traite les
            données à caractère personnel de ses utilisateurs, conformément à la{" "}
            <strong>
              loi n°2013-450 du 19 juin 2013 relative à la protection des données
              à caractère personnel en Côte d’Ivoire
            </strong>
            , aux textes d’application en vigueur, ainsi qu’aux principes
            internationaux reconnus en matière de protection des données
            personnelles (notamment les standards inspirés du RGPD européen).
          </p>
          <p style={{ marginTop: "8px" }}>
            CHEREH est une plateforme numérique d’orientation et de triage basée
            sur l’intelligence artificielle, destinée à améliorer le dépistage
            précoce et l’orientation des femmes en matière de santé.
          </p>
        </section>

        <section id="responsable" style={{ marginTop: "24px" }}>
          <h2>2. Identité du responsable de traitement</h2>
          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              marginTop: "12px",
            }}
          >
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Service</h3>
              <p><strong>Nom du service :</strong> CARE INTELLIGENCY NUMERIC</p>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Responsable</h3>
              <p><strong>Responsable :</strong> GNANHI ZAKPA RICHMOND XAVIER</p>
              <p><strong>Adresse :</strong> COCODY AGHEIN</p>
              <p><strong>Téléphone :</strong> 0706050526</p>
              <p>
                <strong>Email :</strong>{" "}
                <a href="mailto:contact@mail.carein.com">contact@mail.carein.com</a>
              </p>
            </div>
          </div>
          <p style={{ marginTop: "10px" }}>
            Le responsable de traitement détermine les finalités et les moyens
            des traitements de données personnelles effectués via la plateforme
            CHEREH, conformément à la loi n°2013-450.
          </p>
        </section>

        <section id="dpd" style={{ marginTop: "24px" }}>
          <h2>3. Délégué à la protection des données (DPD)</h2>
          <p style={{ marginTop: "8px" }}>
            CHEREH a désigné un <strong>Correspondant à la Protection des Données
            (CPD / DPD) externalisé</strong>, conformément à la loi n°2013-450 du
            19 juin 2013 et sous le contrôle de l’Autorité de Protection des
            Données Personnelles de Côte d’Ivoire (ARTCI).
          </p>
          <div className="card" style={{ marginTop: "12px" }}>
            <h3 style={{ marginTop: 0 }}>Missions principales</h3>
            <ul style={{ marginTop: "10px", paddingLeft: "18px" }}>
              <li>Informer et conseiller le responsable de traitement.</li>
              <li>Contrôler le respect du RGPD.</li>
              <li>Conseiller sur les analyses d’impact (DPIA).</li>
              <li>Coopérer avec l’autorité de contrôle compétente.</li>
              <li>Être le point de contact des utilisateurs.</li>
            </ul>
          </div>
          <div className="card" style={{ marginTop: "12px" }}>
            <h3 style={{ marginTop: 0 }}>Coordonnées du DPD</h3>
            <p><strong>Adresse postale :</strong> [DPD_ADDRESS]</p>
            <p>
              <strong>Adresse électronique :</strong>{" "}
              <a href="mailto:contact@mail.carein.com">contact@mail.carein.com</a>
            </p>
          </div>
        </section>

        <section id="traitements" style={{ marginTop: "24px" }}>
          <h2>4. Catégories de traitements effectués</h2>

          <div className="card" style={{ marginTop: "12px" }}>
            <h3 style={{ marginTop: 0 }}>4.1 Navigation sur la plateforme</h3>
            <p><strong>Finalité :</strong> Permettre l’accès aux contenus, assurer
              la sécurité, la maintenance et l’amélioration continue de la plateforme.</p>
            <p><strong>Données traitées :</strong> Adresse IP, pages consultées,
              durée de connexion, type d’appareil, système d’exploitation, cookies
              techniques et analytiques.</p>
            <p><strong>Base juridique :</strong> Consentement (cookies analytiques
              et publicitaires) et intérêt légitime (fonctionnement technique et sécurité).</p>
            <p><strong>Durée de conservation :</strong> Limitée au temps strictement
              nécessaire à la navigation et conformément à la politique de cookies.</p>
          </div>

          <div className="card" style={{ marginTop: "12px" }}>
            <h3 style={{ marginTop: 0 }}>4.2 Évaluation des symptômes</h3>
            <p><strong>Finalité :</strong> Fournir une orientation personnalisée
              à partir des informations déclarées, sans constituer un diagnostic médical.</p>
            <p><strong>Données traitées :</strong> Sexe, date de naissance, taille
              et poids, facteurs de risque, antécédents médicaux et chirurgicaux,
              allergies, médicaments pris régulièrement.</p>
            <p><strong>Base juridique :</strong> Consentement explicite (article 9 du RGPD – données de santé).</p>
            <p><strong>Durée de conservation :</strong> Utilisation anonyme :
              aucune donnée conservée. Utilisation avec compte : données conservées
              tant que le compte est actif, sauf exercice du droit à l’effacement.</p>
          </div>

          <div className="card" style={{ marginTop: "12px" }}>
            <h3 style={{ marginTop: 0 }}>4.3 Géolocalisation</h3>
            <p><strong>Finalité :</strong> Adapter les recommandations et
              l’orientation aux ressources de santé disponibles localement.</p>
            <p><strong>Données traitées :</strong> Données de localisation
              géographique de l’appareil utilisé.</p>
            <p><strong>Base juridique :</strong> Consentement explicite.</p>
            <p><strong>Durée de conservation :</strong> Limitée à la durée
              nécessaire à la finalité poursuivie ou jusqu’au retrait du consentement.</p>
          </div>
        </section>

        <section id="retrait" style={{ marginTop: "24px" }}>
          <h2>5. Retrait du consentement</h2>
          <p style={{ marginTop: "8px" }}>
            L’utilisateur peut retirer son consentement à tout moment, sans
            justification, en contactant le DPD à l’adresse suivante :{" "}
            <a href="mailto:contact@mail.carein.com">contact@mail.carein.com</a>.
          </p>
          <p style={{ marginTop: "8px" }}>
            Le retrait du consentement n’affecte pas la licéité des traitements
            effectués antérieurement.
          </p>
        </section>

        <section id="refus" style={{ marginTop: "24px" }}>
          <h2>6. Conséquences du refus de fournir les données</h2>
          <p style={{ marginTop: "8px" }}>
            La fourniture de certaines données personnelles est nécessaire pour
            accéder à certaines fonctionnalités de la plateforme, notamment
            l’évaluation des symptômes. Le refus de fournir ces données peut
            entraîner l’impossibilité d’accéder à tout ou partie des services
            proposés par CHEREH.
          </p>
          <p style={{ marginTop: "8px" }}>
            Les données fournies doivent être exactes, pertinentes,
            proportionnées et mises à jour. L’utilisateur demeure seul
            responsable des informations communiquées.
          </p>
        </section>

        <section id="partage" style={{ marginTop: "24px" }}>
          <h2>7. Partage des données avec des tiers</h2>
          <p style={{ marginTop: "8px" }}>
            CHEREH ne partage pas les données personnelles des utilisateurs avec
            des tiers, sauf obligation légale, demande des autorités compétentes
            ou protection des droits, de la sécurité et de la propriété du
            responsable de traitement.
          </p>
          <p style={{ marginTop: "8px" }}>
            Les données peuvent être traitées par des sous-traitants agissant
            pour le compte de CHEREH (hébergement, maintenance, services
            analytiques), dans le cadre de contrats conformes à l’article 28 du RGPD.
          </p>
        </section>

        <section id="transferts" style={{ marginTop: "24px" }}>
          <h2>8. Transferts internationaux de données</h2>
          <p style={{ marginTop: "8px" }}>
            Tout transfert de données personnelles hors du territoire ivoirien
            est soumis à une autorisation préalable de l’ARTCI, conformément à la
            loi n°2013-450. CHEREH ne procède pas, par principe, à des transferts
            de données personnelles hors de l’Espace Économique Européen.
          </p>
          <p style={{ marginTop: "8px" }}>
            Si un tel transfert devait avoir lieu, il serait encadré par des
            garanties appropriées conformément aux articles 44 et suivants du RGPD.
          </p>
        </section>

        <section id="droits" style={{ marginTop: "24px" }}>
          <h2>9. Droits des utilisateurs</h2>
          <p style={{ marginTop: "8px" }}>
            Conformément au RGPD, les utilisateurs disposent des droits suivants :
          </p>
          <ul style={{ marginTop: "8px", paddingLeft: "18px" }}>
            <li>Droit d’accès.</li>
            <li>Droit de rectification.</li>
            <li>Droit à l’effacement.</li>
            <li>Droit à la limitation du traitement.</li>
            <li>Droit d’opposition.</li>
            <li>Droit à la portabilité des données.</li>
          </ul>
          <p style={{ marginTop: "8px" }}>
            Ces droits peuvent être exercés par courrier postal à l’adresse du
            siège social du responsable de traitement, ou par courrier
            électronique à l’adresse :{" "}
            <a href="mailto:contact@mail.carein.com">contact@mail.carein.com</a>.
          </p>
          <p style={{ marginTop: "8px" }}>
            L’utilisateur peut également introduire une réclamation auprès de
            l’Autorité de Régulation des Télécommunications de Côte d’Ivoire
            (ARTCI), autorité compétente en matière de protection des données
            personnelles.
          </p>
        </section>

        <section id="securite" style={{ marginTop: "24px" }}>
          <h2>10. Mesures de sécurité</h2>
          <p style={{ marginTop: "8px" }}>
            CHEREH met en œuvre des mesures techniques et organisationnelles
            appropriées afin de garantir la sécurité, l’intégrité, la
            confidentialité et la disponibilité des données personnelles,
            conformément aux principes de « privacy by design » et « privacy by
            default ». La plateforme utilise notamment le protocole HTTPS et des
            mécanismes de contrôle d’accès renforcés.
          </p>
          <p style={{ marginTop: "8px" }}>
            Les utilisateurs sont responsables de la confidentialité de leurs
            identifiants et mots de passe.
          </p>
        </section>

        <section id="validite" style={{ marginTop: "24px", marginBottom: "12px" }}>
          <h2>11. Validité et modification de la politique</h2>
          <p style={{ marginTop: "8px" }}>
            La présente politique est entrée en vigueur le <strong>9 juillet 2024</strong>
            (version <strong>2.0 – Côte d’Ivoire</strong>). CHEREH se réserve le
            droit de la modifier afin de l’adapter aux évolutions légales,
            réglementaires, techniques ou opérationnelles. Les utilisateurs sont
            invités à la consulter régulièrement.
          </p>
        </section>
      </main>
      <div className="page__actions page__content">
        <button className="btn btn-primary" type="button" onClick={handleAccept}>
          J'accepte et je continue
        </button>
      </div>
    </div>
  );
}
