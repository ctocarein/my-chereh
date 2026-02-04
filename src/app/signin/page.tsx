"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { loginIdentity, registerIdentity } from "@/lib/api/identity";
import { ApiError } from "@/lib/api/client";
import { getDefaultOrganization } from "@/lib/api/organizations";
import { getDeviceFingerprint, storeSecurityGate } from "@/lib/security";

const westAfricaCountries = [
  {
    code: "SN",
    name: "Senegal",
    dial: "+221",
    flag: "linear-gradient(90deg, #00853f 0 33%, #fdef42 33% 66%, #e31b23 66% 100%)",
  },
  {
    code: "CI",
    name: "Cote d'Ivoire",
    dial: "+225",
    flag: "linear-gradient(90deg, #f77f00 0 33%, #ffffff 33% 66%, #009e60 66% 100%)",
  },
  {
    code: "GH",
    name: "Ghana",
    dial: "+233",
    flag: "linear-gradient(180deg, #ce1126 0 33%, #fcd116 33% 66%, #006b3f 66% 100%)",
  },
  {
    code: "NG",
    name: "Nigeria",
    dial: "+234",
    flag: "linear-gradient(90deg, #008753 0 33%, #ffffff 33% 66%, #008753 66% 100%)",
  },
  {
    code: "BJ",
    name: "Benin",
    dial: "+229",
    flag: "linear-gradient(90deg, #008751 0 35%, #fcd116 35% 68%, #e8112d 68% 100%)",
  },
  {
    code: "BF",
    name: "Burkina Faso",
    dial: "+226",
    flag: "linear-gradient(180deg, #ef2b2d 0 50%, #009e49 50% 100%)",
  },
  {
    code: "CV",
    name: "Cap-Vert",
    dial: "+238",
    flag: "linear-gradient(180deg, #003893 0 58%, #ffffff 58% 66%, #cf2027 66% 74%, #ffffff 74% 82%, #003893 82% 100%)",
  },
  {
    code: "GM",
    name: "Gambie",
    dial: "+220",
    flag: "linear-gradient(180deg, #ce1126 0 30%, #ffffff 30% 36%, #0c1c8c 36% 64%, #ffffff 64% 70%, #3a7728 70% 100%)",
  },
  {
    code: "GN",
    name: "Guinee",
    dial: "+224",
    flag: "linear-gradient(90deg, #ce1126 0 33%, #fcd116 33% 66%, #009e49 66% 100%)",
  },
  {
    code: "GW",
    name: "Guinee-Bissau",
    dial: "+245",
    flag: "linear-gradient(90deg, #ce1126 0 35%, #fcd116 35% 68%, #009e49 68% 100%)",
  },
  {
    code: "LR",
    name: "Liberia",
    dial: "+231",
    flag: "linear-gradient(180deg, #ce1126 0 50%, #ffffff 50% 100%)",
  },
  {
    code: "ML",
    name: "Mali",
    dial: "+223",
    flag: "linear-gradient(90deg, #14b53a 0 33%, #fcd116 33% 66%, #ce1126 66% 100%)",
  },
  {
    code: "MR",
    name: "Mauritanie",
    dial: "+222",
    flag: "linear-gradient(180deg, #006233 0 40%, #fcd116 40% 60%, #006233 60% 100%)",
  },
  {
    code: "NE",
    name: "Niger",
    dial: "+227",
    flag: "linear-gradient(180deg, #e05206 0 33%, #ffffff 33% 66%, #0db02b 66% 100%)",
  },
  {
    code: "SL",
    name: "Sierra Leone",
    dial: "+232",
    flag: "linear-gradient(180deg, #1eb53a 0 33%, #ffffff 33% 66%, #0072c6 66% 100%)",
  },
  {
    code: "TG",
    name: "Togo",
    dial: "+228",
    flag: "linear-gradient(180deg, #006a4e 0 20%, #fcd116 20% 40%, #006a4e 40% 60%, #fcd116 60% 80%, #006a4e 80% 100%)",
  },
] as const;

type CountryCode = (typeof westAfricaCountries)[number]["code"];

const defaultCountry =
  westAfricaCountries.find((country) => country.code === "CI") ??
  westAfricaCountries[0];

const authTokenStorageKey = "chereh_auth_token";
const identityStorageKey = "chereh_identity";
const membershipStorageKey = "chereh_membership";
const credentialStorageKey = "chereh_credential";
const credentialType = "phone";
const defaultRole = "Beneficiary";
const defaultKind = "person";

const extractOrganizationId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const directId =
    record.id ?? record.organization_id ?? record.organizationId;
  if (typeof directId === "string") {
    return directId;
  }

  const nested =
    record.organization ?? record.data ?? record.default ?? record.item;
  if (nested && typeof nested === "object") {
    const nestedRecord = nested as Record<string, unknown>;
    const nestedId =
      nestedRecord.id ??
      nestedRecord.organization_id ??
      nestedRecord.organizationId;
    if (typeof nestedId === "string") {
      return nestedId;
    }
  }

  return null;
};

const sanitizePhone = (value: string) => value.replace(/[^\d]/g, "");

const buildFullPhone = (dial: string, input: string) => {
  const trimmed = input.trim();
  const digits = sanitizePhone(trimmed);

  if (!digits) {
    return "";
  }

  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  const withoutLeadingZeros = digits.replace(/^0+/, "");
  return `${dial}${withoutLeadingZeros || digits}`;
};

const extractFirstError = (data: unknown) => {
  if (!data || typeof data !== "object") {
    return null;
  }

  const errors = (data as { errors?: Record<string, unknown> }).errors;
  if (!errors || typeof errors !== "object") {
    return null;
  }

  for (const value of Object.values(errors)) {
    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === "string");
      if (first) {
        return first;
      }
    } else if (typeof value === "string") {
      return value;
    }
  }

  return null;
};

const formatApiError = (error: ApiError) => {
  const fallback = `Erreur ${error.status}. Veuillez reessayer.`;

  if (!error.data) {
    return fallback;
  }

  if (typeof error.data === "string") {
    return error.data;
  }

  if (typeof error.data === "object") {
    const firstError = extractFirstError(error.data);
    if (firstError) {
      return firstError;
    }

    const data = error.data as { message?: string };
    if (typeof data.message === "string") {
      return data.message;
    }

    try {
      return `Erreur ${error.status}. ${JSON.stringify(error.data)}`;
    } catch {
      return fallback;
    }
  }

  return fallback;
};

export default function SignInPage() {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState<CountryCode>(
    defaultCountry.code,
  );
  const [phoneInput, setPhoneInput] = useState("");
  const [needsAssistance, setNeedsAssistance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const selectedCountry =
    westAfricaCountries.find((country) => country.code === countryCode) ??
    westAfricaCountries[0];
  const localDigits = useMemo(() => sanitizePhone(phoneInput), [phoneInput]);
  const fullPhone = useMemo(
    () => buildFullPhone(selectedCountry.dial, phoneInput),
    [phoneInput, selectedCountry.dial],
  );
  const isPhoneReady = phoneInput.trim().startsWith("+")
    ? localDigits.length >= 8
    : localDigits.length >= 6;

  const persistSession = (response: {
    token: string;
    identity: unknown;
    membership?: unknown;
    credential?: unknown;
    security_gate?: unknown;
  }) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(authTokenStorageKey, response.token);
    window.localStorage.setItem(
      identityStorageKey,
      JSON.stringify(response.identity),
    );
    if (response.membership) {
      window.localStorage.setItem(
        membershipStorageKey,
        JSON.stringify(response.membership),
      );
    }
    if (response.credential) {
      window.localStorage.setItem(
        credentialStorageKey,
        JSON.stringify(response.credential),
      );
    }
    if (response.security_gate) {
      storeSecurityGate(response.security_gate);
    }
  };

  const resolveOrganizationId = async () => {
    const response = await getDefaultOrganization();
    const organizationId = extractOrganizationId(response);
    if (!organizationId) {
      throw new Error("Missing default organization id");
    }
    return organizationId;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isPhoneReady) {
      setErrorMessage("Merci d'entrer un numero de telephone valide.");
      return;
    }

    setIsSubmitting(true);

    try {
      try {
        const response = await loginIdentity({
          credential_type: credentialType,
          identifier: fullPhone,
          device_fingerprint: getDeviceFingerprint(),
        });

        persistSession(response);
        setSuccessMessage("Connexion reussie. Redirection en cours...");
        router.push("/profile");
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw error;
        }

        if (error.status !== 404 && error.status !== 422) {
          throw error;
        }

        const organizationId = await resolveOrganizationId();
        const response = await registerIdentity({
          kind: defaultKind,
          role: defaultRole,
          organization_id: organizationId,
          credential_type: credentialType,
          identifier: fullPhone,
          device_fingerprint: getDeviceFingerprint(),
        });

        persistSession(response);
        setSuccessMessage("Compte cree. Redirection en cours...");
        router.push("/profile");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(formatApiError(error));
      } else {
        setErrorMessage(
          "Connexion impossible pour le moment. Verifiez le numero et reessayez.",
        );
      }
      // eslint-disable-next-line no-console
      console.error("Account login failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="page__content auth__header">
        <Link className="auth__back" href="/consent">
          Retour
        </Link>
        <div className="auth__logo">
          <Image
            src="/logo.png"
            alt="CheReh"
            width={220}
            height={96}
            priority
            className="h-auto w-full"
          />
        </div>
      </header>
      <main className="page__content auth__content">
        <h1>Se connecter ou s'inscrire</h1>
        <form id="signin-form" onSubmit={handleSubmit} style={{ width: "100%" }}>
          <label className="field">
            <span className="field__label">Pays</span>
            <div className="field__input select">
              <span
                className="select__flag"
                style={{ background: selectedCountry.flag }}
                aria-hidden="true"
              />
              <select
                className="select__control"
                value={countryCode}
                onChange={(event) =>
                  setCountryCode(event.target.value as CountryCode)
                }
                aria-label="Pays d'Afrique de l'ouest"
              >
                {westAfricaCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} {country.dial}
                  </option>
                ))}
              </select>
              <span className="select__chevron" aria-hidden="true" />
            </div>
          </label>
          <label className="field">
            <span className="field__label">Numero telephone</span>
            <div className="field__input">
              <span className="field__prefix">{selectedCountry.dial}</span>
              <input
                className="field__control"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="700 000 000"
                aria-label="Numero telephone"
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value)}
              />
            </div>
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              Nous utilisons votre numero pour creer votre compte et vous
              reconnecter.
            </span>
          </label>
          <label className="field">
            <span className="field__label">Besoin d'assistance</span>
            <div className="field__input">
              <input
                type="checkbox"
                checked={needsAssistance}
                onChange={(event) => setNeedsAssistance(event.target.checked)}
                aria-label="Besoin d'assistance"
              />
              <span>Je souhaite etre accompagnee par un agent.</span>
            </div>
          </label>
          {errorMessage ? (
            <p className="chat-input__error" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {successMessage ? (
            <p style={{ color: "var(--support)", fontSize: "0.9rem" }}>
              {successMessage}
            </p>
          ) : null}
        </form>
      </main>
      <div className="page__actions page__content auth__actions">
        {/* <Link className="auth__link" href="/profile">
          Je reste anonyme
        </Link> */}
        <button
          type="submit"
          form="signin-form"
          className="btn btn-primary auth__primary"
          disabled={isSubmitting || !isPhoneReady}
        >
          {isSubmitting ? "En cours..." : "Je continue"}
        </button>
      </div>
    </div>
  );
}
