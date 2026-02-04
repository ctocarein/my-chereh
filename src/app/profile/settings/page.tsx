"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import RequireAuth from "@/components/auth/RequireAuth";
import RequireGate from "@/components/auth/RequireGate";
import {
  getCurrentIdentity,
  getMedicalProfile,
  getPersonalProfile,
  getSecurityStatus,
  updateMedicalProfile,
  updatePersonalProfile,
  logoutIdentity,
  setIdentitySecret,
  unlockIdentity,
} from "@/lib/api/identity";
import type { SecurityGate } from "@/lib/api/types";
import {
  getDeviceFingerprint,
  isGateLocked,
  isGateRequired,
  isSecretSet,
  readSecurityGate,
  storeSecurityGate,
} from "@/lib/security";

type PersonalProfileForm = {
  first_name: string;
  last_name: string;
  birth_date: string;
  language: string;
  education_level: string;
  commune: string;
};

type MedicalProfileForm = {
  cmu_number: string;
  height: string;
  weight: string;
  blood_type: string;
  allergies: string;
  is_pregnant: boolean;
  breastfeeding: boolean;
  menopause_status: string;
  family_cancer_history: boolean;
  last_screening_date: string;
  screening_type: string;
  first_sexual_intercourse_age: string;
  number_of_partners: string;
  number_of_pregnancies: string;
  number_of_abortions: string;
  number_of_children: string;
  exposed_to_smoke: boolean;
  exposure_type: string;
  notes: string;
};

const emptyPersonal: PersonalProfileForm = {
  first_name: "",
  last_name: "",
  birth_date: "",
  language: "",
  education_level: "",
  commune: "",
};

const emptyMedical: MedicalProfileForm = {
  cmu_number: "",
  height: "",
  weight: "",
  blood_type: "",
  allergies: "",
  is_pregnant: false,
  breastfeeding: false,
  menopause_status: "",
  family_cancer_history: false,
  last_screening_date: "",
  screening_type: "",
  first_sexual_intercourse_age: "",
  number_of_partners: "",
  number_of_pregnancies: "",
  number_of_abortions: "",
  number_of_children: "",
  exposed_to_smoke: false,
  exposure_type: "",
  notes: "",
};

const normalizeProfilePayload = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const nested =
    (record.data as Record<string, unknown> | undefined) ??
    (record.profile as Record<string, unknown> | undefined);
  return nested && typeof nested === "object" ? nested : record;
};

const mapString = (value: unknown) =>
  typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);

const mapBoolean = (value: unknown) => Boolean(value);

const mapNumberString = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [identityName, setIdentityName] = useState("");
  const [identitySubtitle, setIdentitySubtitle] = useState("");
  const [personalForm, setPersonalForm] = useState<PersonalProfileForm>(
    emptyPersonal,
  );
  const [medicalForm, setMedicalForm] = useState<MedicalProfileForm>(emptyMedical);
  const [personalStatus, setPersonalStatus] = useState<string | null>(null);
  const [medicalStatus, setMedicalStatus] = useState<string | null>(null);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingMedical, setIsSavingMedical] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "personal" | "medical" | "security"
  >("personal");
  const [securityGate, setSecurityGate] = useState<SecurityGate | null>(null);
  const [isGateLoading, setIsGateLoading] = useState(true);
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isAgentUnlocking, setIsAgentUnlocking] = useState(false);
  const [isBiometricUnlocking, setIsBiometricUnlocking] = useState(false);
  const [secretPin, setSecretPin] = useState("");
  const [secretError, setSecretError] = useState<string | null>(null);
  const [isSettingSecret, setIsSettingSecret] = useState(false);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      const [identity, personal, medical] = await Promise.all([
        getCurrentIdentity().catch(() => null),
        getPersonalProfile().catch(() => null),
        getMedicalProfile().catch(() => null),
      ]);
      if (!isActive) {
        return;
      }
      const identityRecord = normalizeProfilePayload(identity);
      const personalRecord = normalizeProfilePayload(personal);
      const medicalRecord = normalizeProfilePayload(medical);
      const displayName =
        mapString(identityRecord?.name) ||
        `${mapString(identityRecord?.first_name)} ${mapString(identityRecord?.last_name)}`.trim();
      setIdentityName(displayName.trim());
      setIdentitySubtitle(mapString(identityRecord?.role) || "Profil");
      setPersonalForm({
        first_name: mapString(personalRecord?.first_name),
        last_name: mapString(personalRecord?.last_name),
        birth_date: mapString(personalRecord?.birth_date),
        language: mapString(personalRecord?.language),
        education_level: mapString(personalRecord?.education_level),
        commune: mapString(personalRecord?.commune),
      });
      setMedicalForm({
        cmu_number: mapString(medicalRecord?.cmu_number),
        height: mapNumberString(medicalRecord?.height),
        weight: mapNumberString(medicalRecord?.weight),
        blood_type: mapString(medicalRecord?.blood_type),
        allergies: mapString(medicalRecord?.allergies),
        is_pregnant: mapBoolean(medicalRecord?.is_pregnant),
        breastfeeding: mapBoolean(medicalRecord?.breastfeeding),
        menopause_status: mapString(medicalRecord?.menopause_status),
        family_cancer_history: mapBoolean(medicalRecord?.family_cancer_history),
        last_screening_date: mapString(medicalRecord?.last_screening_date),
        screening_type: mapString(medicalRecord?.screening_type),
        first_sexual_intercourse_age: mapNumberString(
          medicalRecord?.first_sexual_intercourse_age,
        ),
        number_of_partners: mapNumberString(medicalRecord?.number_of_partners),
        number_of_pregnancies: mapNumberString(medicalRecord?.number_of_pregnancies),
        number_of_abortions: mapNumberString(medicalRecord?.number_of_abortions),
        number_of_children: mapNumberString(medicalRecord?.number_of_children),
        exposed_to_smoke: mapBoolean(medicalRecord?.exposed_to_smoke),
        exposure_type: mapString(medicalRecord?.exposure_type),
        notes: mapString(medicalRecord?.notes),
      });
    };
    void load();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const storedGate = readSecurityGate();
    if (storedGate) {
      setSecurityGate(storedGate);
    }

    const loadSecurityGate = async () => {
      try {
        const gate = await getSecurityStatus(getDeviceFingerprint());
        if (!isActive) {
          return;
        }
        setSecurityGate(gate);
        storeSecurityGate(gate);
      } catch {
        // Ignore gate fetch errors.
      } finally {
        if (isActive) {
          setIsGateLoading(false);
        }
      }
    };

    void loadSecurityGate();

    return () => {
      isActive = false;
    };
  }, []);

  const handlePersonalChange = (field: keyof PersonalProfileForm, value: string) => {
    setPersonalForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMedicalChange = (
    field: keyof MedicalProfileForm,
    value: string | boolean,
  ) => {
    setMedicalForm((prev) => ({ ...prev, [field]: value }));
  };

  const savePersonal = async () => {
    setIsSavingPersonal(true);
    setPersonalStatus(null);
    try {
      await updatePersonalProfile({ ...personalForm });
      setPersonalStatus("Profil personnel mis a jour.");
    } catch {
      setPersonalStatus("Impossible de mettre a jour le profil personnel.");
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const saveMedical = async () => {
    setIsSavingMedical(true);
    setMedicalStatus(null);
    try {
      await updateMedicalProfile({
        ...medicalForm,
        height: medicalForm.height ? Number(medicalForm.height) : null,
        weight: medicalForm.weight ? Number(medicalForm.weight) : null,
        first_sexual_intercourse_age: medicalForm.first_sexual_intercourse_age
          ? Number(medicalForm.first_sexual_intercourse_age)
          : null,
        number_of_partners: medicalForm.number_of_partners
          ? Number(medicalForm.number_of_partners)
          : null,
        number_of_pregnancies: medicalForm.number_of_pregnancies
          ? Number(medicalForm.number_of_pregnancies)
          : null,
        number_of_abortions: medicalForm.number_of_abortions
          ? Number(medicalForm.number_of_abortions)
          : null,
        number_of_children: medicalForm.number_of_children
          ? Number(medicalForm.number_of_children)
          : null,
      });
      setMedicalStatus("Profil medical mis a jour.");
    } catch {
      setMedicalStatus("Impossible de mettre a jour le profil medical.");
    } finally {
      setIsSavingMedical(false);
    }
  };

  const handleUnlock = async () => {
    setUnlockError(null);
    const normalized = unlockPin.replace(/[^\d]/g, "");
    if (normalized.length < 4) {
      setUnlockError("Entrez votre code secret a 4 chiffres.");
      return;
    }

    setIsUnlocking(true);
    try {
      const response = await unlockIdentity({
        method: "pin",
        secret: normalized,
        device_fingerprint: getDeviceFingerprint(),
      });
      const gate = response.security_gate;
      setSecurityGate(gate);
      storeSecurityGate(gate);
      setUnlockPin("");
    } catch {
      setUnlockError(
        "Code incorrect ou tentative trop rapide. Reessayez plus tard.",
      );
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleUnlockAgent = async () => {
    setUnlockError(null);
    setIsAgentUnlocking(true);
    try {
      const response = await unlockIdentity({
        method: "agent",
        device_fingerprint: getDeviceFingerprint(),
      });
      const gate = response.security_gate;
      setSecurityGate(gate);
      storeSecurityGate(gate);
    } catch {
      setUnlockError("Validation agent impossible pour le moment.");
    } finally {
      setIsAgentUnlocking(false);
    }
  };

  const handleUnlockBiometric = async () => {
    setUnlockError(null);
    setIsBiometricUnlocking(true);
    try {
      const response = await unlockIdentity({
        method: "biometric",
        device_fingerprint: getDeviceFingerprint(),
      });
      const gate = response.security_gate;
      setSecurityGate(gate);
      storeSecurityGate(gate);
    } catch {
      setUnlockError("Deverrouillage biometrie indisponible.");
    } finally {
      setIsBiometricUnlocking(false);
    }
  };

  const handleSetSecret = async () => {
    setSecretError(null);
    const normalized = secretPin.replace(/[^\d]/g, "");
    if (normalized.length < 4) {
      setSecretError("Le code secret doit contenir 4 chiffres.");
      return;
    }

    setIsSettingSecret(true);
    try {
      const response = await setIdentitySecret({ secret: normalized });
      const gate = response.security_gate;
      if (gate) {
        setSecurityGate(gate);
        storeSecurityGate(gate);
      }
      setSecretPin("");
    } catch {
      setSecretError("Impossible d'activer le code secret.");
    } finally {
      setIsSettingSecret(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutIdentity();
    } catch {
      // Ignore logout errors.
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("evaluation-flow-v1");
      }
      storeSecurityGate(null);
      router.push("/signin");
    }
  };

  const title = useMemo(
    () => (identityName ? `Parametres de ${identityName}` : "Parametres du profil"),
    [identityName],
  );
  const profileInitial = useMemo(() => {
    if (personalForm.first_name.trim()) {
      return personalForm.first_name.trim()[0]?.toUpperCase() ?? null;
    }
    if (identityName.trim()) {
      return identityName.trim()[0]?.toUpperCase() ?? null;
    }
    return null;
  }, [identityName, personalForm.first_name]);
  const gateRequired = useMemo(
    () => isGateRequired(securityGate),
    [securityGate],
  );
  const gateLocked = useMemo(
    () => isGateLocked(securityGate),
    [securityGate],
  );
  const hasSecret = useMemo(
    () => isSecretSet(securityGate),
    [securityGate],
  );
  const isDeviceTrusted = securityGate?.device_trusted !== false;
  const lockedUntilLabel = useMemo(() => {
    if (!securityGate?.locked_until) {
      return "";
    }
    const lockedUntil =
      typeof securityGate.locked_until === "number"
        ? securityGate.locked_until
        : Date.parse(securityGate.locked_until);
    if (Number.isNaN(lockedUntil)) {
      return "";
    }
    return new Date(lockedUntil).toLocaleString("fr-FR");
  }, [securityGate?.locked_until]);

  return (
    <RequireAuth>
      <RequireGate>
      <div className="page page--profile">
        <main className="page__content profile-dashboard profile-settings">
          <header className="profile-dashboard__header">
            <div className="profile-dashboard__heading">
              <div className="page-header">
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
                <div className="page-header__title">Parametres</div>
              </div>
              <h1 className="profile-dashboard__title">{title}</h1>
              <p className="profile-dashboard__subtitle">
                Mettez a jour vos informations personnelles et medicales.
              </p>
            </div>
          </header>

          <section className="settings-card">
            <div className="settings-card__header">
              <div className="settings-card__avatar">
                {profileInitial ? (
                  profileInitial
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M9 10h.01" />
                    <path d="M15 10h.01" />
                    <path d="M8.5 14c1.5 1.5 5.5 1.5 7 0" />
                  </svg>
                )}
              </div>
              <div>
                <p className="settings-card__name">
                  {identityName || "Utilisateur"}
                </p>
                <p className="settings-card__subtitle">{identitySubtitle}</p>
              </div>
            </div>
            <div className="settings-card__menu">
              <button
                type="button"
                className={`settings-card__item ${
                  activeSection === "personal" ? "is-active" : ""
                }`}
                onClick={() => setActiveSection("personal")}
              >
                <span className="settings-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 20c1.5-4 12.5-4 14 0" />
                  </svg>
                </span>
                <span>Donnees personnelles</span>
                <span className="settings-card__chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              </button>
              <button
                type="button"
                className={`settings-card__item ${
                  activeSection === "medical" ? "is-active" : ""
                }`}
                onClick={() => setActiveSection("medical")}
              >
                <span className="settings-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" />
                    <path d="M9 12h6" />
                    <path d="M12 9v6" />
                  </svg>
                </span>
                <span>Donnees medicales</span>
                <span className="settings-card__chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              </button>
              <button
                type="button"
                className={`settings-card__item ${
                  activeSection === "security" ? "is-active" : ""
                }`}
                onClick={() => setActiveSection("security")}
              >
                <span className="settings-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 018 0v3" />
                  </svg>
                </span>
                <span>Securite</span>
                <span className="settings-card__chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              </button>
              <button
                type="button"
                className="settings-card__item settings-card__item--danger"
                onClick={handleLogout}
              >
                <span className="settings-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12h10" />
                    <path d="M10 8l4 4-4 4" />
                    <path d="M14 4h6v16h-6" />
                  </svg>
                </span>
                <span>Se deconnecter</span>
                <span className="settings-card__chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              </button>
            </div>
          </section>

          <section className="profile-card">
            <h2 className="profile-tile__title">Profil personnel</h2>
            <div className="profile-settings__grid" hidden={activeSection !== "personal"}>
              <label className="profile-settings__field">
                Prenom
                <input
                  type="text"
                  value={personalForm.first_name}
                  onChange={(event) =>
                    handlePersonalChange("first_name", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Nom
                <input
                  type="text"
                  value={personalForm.last_name}
                  onChange={(event) =>
                    handlePersonalChange("last_name", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Date de naissance
                <input
                  type="date"
                  value={personalForm.birth_date}
                  onChange={(event) =>
                    handlePersonalChange("birth_date", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Langue
                <input
                  type="text"
                  value={personalForm.language}
                  onChange={(event) =>
                    handlePersonalChange("language", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Niveau d'etude
                <input
                  type="text"
                  value={personalForm.education_level}
                  onChange={(event) =>
                    handlePersonalChange("education_level", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Commune
                <input
                  type="text"
                  value={personalForm.commune}
                  onChange={(event) =>
                    handlePersonalChange("commune", event.target.value)
                  }
                />
              </label>
            </div>
            <div className="profile-settings__actions">
              {personalStatus ? (
                <span className="profile-settings__status">{personalStatus}</span>
              ) : null}
              <button
                type="button"
                className="btn profile-btn"
                onClick={savePersonal}
                disabled={isSavingPersonal}
              >
                {isSavingPersonal ? "Enregistrement..." : "Mettre a jour"}
              </button>
            </div>
          </section>

          <section className="profile-card">
            <h2 className="profile-tile__title">Profil medical</h2>
            <div
              className="profile-settings__grid profile-settings__grid--medical"
              hidden={activeSection !== "medical"}
            >
              <label className="profile-settings__field">
                CMU
                <input
                  type="text"
                  value={medicalForm.cmu_number}
                  onChange={(event) =>
                    handleMedicalChange("cmu_number", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Taille
                <input
                  type="number"
                  value={medicalForm.height}
                  onChange={(event) =>
                    handleMedicalChange("height", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Poids
                <input
                  type="number"
                  value={medicalForm.weight}
                  onChange={(event) =>
                    handleMedicalChange("weight", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Groupe sanguin
                <input
                  type="text"
                  value={medicalForm.blood_type}
                  onChange={(event) =>
                    handleMedicalChange("blood_type", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Allergies
                <input
                  type="text"
                  value={medicalForm.allergies}
                  onChange={(event) =>
                    handleMedicalChange("allergies", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field profile-settings__field--toggle">
                <span>Enceinte</span>
                <input
                  type="checkbox"
                  checked={medicalForm.is_pregnant}
                  onChange={(event) =>
                    handleMedicalChange("is_pregnant", event.target.checked)
                  }
                />
              </label>
              <label className="profile-settings__field profile-settings__field--toggle">
                <span>Allaitement</span>
                <input
                  type="checkbox"
                  checked={medicalForm.breastfeeding}
                  onChange={(event) =>
                    handleMedicalChange("breastfeeding", event.target.checked)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Menopause
                <input
                  type="text"
                  value={medicalForm.menopause_status}
                  onChange={(event) =>
                    handleMedicalChange("menopause_status", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field profile-settings__field--toggle">
                <span>Antecedents cancer</span>
                <input
                  type="checkbox"
                  checked={medicalForm.family_cancer_history}
                  onChange={(event) =>
                    handleMedicalChange(
                      "family_cancer_history",
                      event.target.checked,
                    )
                  }
                />
              </label>
              <label className="profile-settings__field">
                Dernier depistage
                <input
                  type="date"
                  value={medicalForm.last_screening_date}
                  onChange={(event) =>
                    handleMedicalChange("last_screening_date", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Type depistage
                <input
                  type="text"
                  value={medicalForm.screening_type}
                  onChange={(event) =>
                    handleMedicalChange("screening_type", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Age 1er rapport
                <input
                  type="number"
                  value={medicalForm.first_sexual_intercourse_age}
                  onChange={(event) =>
                    handleMedicalChange(
                      "first_sexual_intercourse_age",
                      event.target.value,
                    )
                  }
                />
              </label>
              <label className="profile-settings__field">
                Nombre partenaires
                <input
                  type="number"
                  value={medicalForm.number_of_partners}
                  onChange={(event) =>
                    handleMedicalChange("number_of_partners", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Grossesses
                <input
                  type="number"
                  value={medicalForm.number_of_pregnancies}
                  onChange={(event) =>
                    handleMedicalChange(
                      "number_of_pregnancies",
                      event.target.value,
                    )
                  }
                />
              </label>
              <label className="profile-settings__field">
                Avortements
                <input
                  type="number"
                  value={medicalForm.number_of_abortions}
                  onChange={(event) =>
                    handleMedicalChange(
                      "number_of_abortions",
                      event.target.value,
                    )
                  }
                />
              </label>
              <label className="profile-settings__field">
                Enfants
                <input
                  type="number"
                  value={medicalForm.number_of_children}
                  onChange={(event) =>
                    handleMedicalChange("number_of_children", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field profile-settings__field--toggle">
                <span>Exposee a la fumee</span>
                <input
                  type="checkbox"
                  checked={medicalForm.exposed_to_smoke}
                  onChange={(event) =>
                    handleMedicalChange("exposed_to_smoke", event.target.checked)
                  }
                />
              </label>
              <label className="profile-settings__field">
                Type d'exposition
                <input
                  type="text"
                  value={medicalForm.exposure_type}
                  onChange={(event) =>
                    handleMedicalChange("exposure_type", event.target.value)
                  }
                />
              </label>
              <label className="profile-settings__field profile-settings__field--full">
                Notes
                <textarea
                  value={medicalForm.notes}
                  onChange={(event) =>
                    handleMedicalChange("notes", event.target.value)
                  }
                />
              </label>
            </div>
            <div className="profile-settings__actions">
              {medicalStatus ? (
                <span className="profile-settings__status">{medicalStatus}</span>
              ) : null}
              <button
                type="button"
                className="btn profile-btn"
                onClick={saveMedical}
                disabled={isSavingMedical}
              >
                {isSavingMedical ? "Enregistrement..." : "Mettre a jour"}
              </button>
            </div>
          </section>

          <section className="profile-card">
            <h2 className="profile-tile__title">Securite</h2>
            <div
              className="profile-settings__grid"
              hidden={activeSection !== "security"}
            >
              <div className="profile-settings__field profile-settings__field--full">
                <p className="profile-settings__status">
                  {isGateLoading
                    ? "Verification de securite en cours..."
                    : gateLocked
                      ? `Votre compte est temporairement verrouille.${
                        lockedUntilLabel
                          ? ` Reessayez apres ${lockedUntilLabel}.`
                          : ""
                      }`
                      : gateRequired
                        ? "Acces limite. Deverrouillez pour consulter vos donnees sensibles."
                        : "Acces complet aux donnees de sante."}
                </p>
                {!isDeviceTrusted ? (
                  <p className="profile-settings__status">
                    Nouvel appareil detecte. Un deverrouillage est requis.
                  </p>
                ) : null}
              </div>
              {gateRequired && !gateLocked && hasSecret ? (
                <label className="profile-settings__field">
                  Code secret
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="****"
                    value={unlockPin}
                    onChange={(event) => setUnlockPin(event.target.value)}
                  />
                </label>
              ) : null}
              {unlockError ? (
                <div className="profile-settings__field profile-settings__field--full">
                  <p className="chat-input__error" role="alert">
                    {unlockError}
                  </p>
                </div>
              ) : null}
              {gateRequired && !gateLocked ? (
                <div className="profile-settings__field profile-settings__field--full">
                  <div className="profile-settings__stack">
                    {hasSecret ? (
                      <button
                        type="button"
                        className="btn profile-btn"
                        onClick={handleUnlock}
                        disabled={isUnlocking}
                      >
                        {isUnlocking ? "Deverrouillage..." : "Deverrouiller"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-secondary w-full"
                      onClick={handleUnlockAgent}
                      disabled={isAgentUnlocking}
                    >
                      {isAgentUnlocking ? "Validation..." : "Valider avec un agent"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary w-full"
                      onClick={handleUnlockBiometric}
                      disabled={isBiometricUnlocking}
                    >
                      {isBiometricUnlocking
                        ? "Verification..."
                        : "Deverrouiller par biometrie"}
                    </button>
                  </div>
                </div>
              ) : null}
              {gateRequired && !gateLocked && !hasSecret ? (
                <div className="profile-settings__field profile-settings__field--full">
                  <p className="profile-settings__status">
                    Un code secret est requis pour deverrouiller l'acces.
                  </p>
                </div>
              ) : null}
              {!hasSecret ? (
                <label className="profile-settings__field">
                  Nouveau code secret
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="****"
                    value={secretPin}
                    onChange={(event) => setSecretPin(event.target.value)}
                  />
                </label>
              ) : null}
              {secretError ? (
                <div className="profile-settings__field profile-settings__field--full">
                  <p className="chat-input__error" role="alert">
                    {secretError}
                  </p>
                </div>
              ) : null}
              {!hasSecret ? (
                <div className="profile-settings__field profile-settings__field--full">
                  <button
                    type="button"
                    className="btn profile-btn"
                    onClick={handleSetSecret}
                    disabled={isSettingSecret}
                  >
                    {isSettingSecret ? "Activation..." : "Activer la securite"}
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </main>
      </div>
      </RequireGate>
    </RequireAuth>
  );
}
