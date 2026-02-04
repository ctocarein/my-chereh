"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import RequireAuth from "@/components/auth/RequireAuth";
import { getSecurityStatus, setIdentitySecret, unlockIdentity } from "@/lib/api/identity";
import type { SecurityGate } from "@/lib/api/types";
import {
  getDeviceFingerprint,
  isGateLocked,
  isGateRequired,
  isSecretSet,
  storeSecurityGate,
} from "@/lib/security";

export default function GatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [securityGate, setSecurityGate] = useState<SecurityGate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [secretPin, setSecretPin] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isAgentUnlocking, setIsAgentUnlocking] = useState(false);
  const [isBiometricUnlocking, setIsBiometricUnlocking] = useState(false);
  const [isSettingSecret, setIsSettingSecret] = useState(false);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        const gate = await getSecurityStatus(getDeviceFingerprint());
        if (!isActive) {
          return;
        }
        setSecurityGate(gate);
        storeSecurityGate(gate);
      } catch {
        setErrorMessage("Impossible de verifier la securite.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, []);

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

  const nextHref = useMemo(() => {
    const next = searchParams?.get("next");
    return next && next.startsWith("/") ? next : "/profile";
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && !gateRequired && !gateLocked) {
      router.replace("/gate/success?next=" + encodeURIComponent(nextHref));
    }
  }, [gateLocked, gateRequired, isLoading, nextHref, router]);

  const handleUnlockPin = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    const normalized = pinInput.replace(/[^\d]/g, "");
    if (normalized.length < 4) {
      setErrorMessage("Entrez votre code secret a 4 chiffres.");
      return;
    }

    setIsUnlocking(true);
    try {
      const response = await unlockIdentity({
        method: "pin",
        secret: normalized,
        device_fingerprint: getDeviceFingerprint(),
      });
      setSecurityGate(response.security_gate);
      storeSecurityGate(response.security_gate);
      setPinInput("");
    } catch {
      setErrorMessage(
        "Code incorrect ou tentative trop rapide. Reessayez plus tard.",
      );
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleUnlockAgent = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsAgentUnlocking(true);
    try {
      const response = await unlockIdentity({
        method: "agent",
        device_fingerprint: getDeviceFingerprint(),
      });
      setSecurityGate(response.security_gate);
      storeSecurityGate(response.security_gate);
    } catch {
      setErrorMessage("Validation agent impossible pour le moment.");
    } finally {
      setIsAgentUnlocking(false);
    }
  };

  const handleUnlockBiometric = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsBiometricUnlocking(true);
    try {
      const response = await unlockIdentity({
        method: "biometric",
        device_fingerprint: getDeviceFingerprint(),
      });
      setSecurityGate(response.security_gate);
      storeSecurityGate(response.security_gate);
    } catch {
      setErrorMessage("Deverrouillage biometrie indisponible.");
    } finally {
      setIsBiometricUnlocking(false);
    }
  };

  const handleSetSecret = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    const normalized = secretPin.replace(/[^\d]/g, "");
    if (normalized.length < 4) {
      setErrorMessage("Le code secret doit contenir 4 chiffres.");
      return;
    }
    setIsSettingSecret(true);
    try {
      const response = await setIdentitySecret({ secret: normalized });
      if (response.security_gate) {
        setSecurityGate(response.security_gate);
        storeSecurityGate(response.security_gate);
      }
      setSecretPin("");
    } catch {
      setErrorMessage("Impossible d'activer le code secret.");
    } finally {
      setIsSettingSecret(false);
    }
  };

  return (
    <RequireAuth>
      <div className="page">
        <main className="page__content">
          <header className="page-header">
            <div className="page-header__title">Deverrouillage</div>
          </header>
          {isLoading ? (
            <p style={{ color: "var(--muted)" }}>Verification en cours...</p>
          ) : gateLocked ? (
            <p className="chat-input__error" role="alert">
              Votre compte est temporairement verrouille.
            </p>
          ) : (
            <>
              <p style={{ color: "var(--muted)" }}>
                Pour proteger vos informations de sante, deverrouillez l'acces.
              </p>
              {hasSecret ? (
                <label className="field">
                  <span className="field__label">Code secret</span>
                  <div className="field__input">
                    <input
                      className="field__control"
                      type="password"
                      inputMode="numeric"
                      placeholder="••••"
                      value={pinInput}
                      onChange={(event) => setPinInput(event.target.value)}
                    />
                  </div>
                </label>
              ) : null}
              {!hasSecret ? (
                <label className="field">
                  <span className="field__label">Creer un code secret</span>
                  <div className="field__input">
                    <input
                      className="field__control"
                      type="password"
                      inputMode="numeric"
                      placeholder="••••"
                      value={secretPin}
                      onChange={(event) => setSecretPin(event.target.value)}
                    />
                  </div>
                </label>
              ) : null}
              {errorMessage ? (
                <p className="chat-input__error" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              <div className="page__actions page__content">
                {hasSecret ? (
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={handleUnlockPin}
                    disabled={isUnlocking}
                  >
                    {isUnlocking ? "Deverrouillage..." : "Deverrouiller par PIN"}
                  </button>
                ) : null}
                {!hasSecret ? (
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={handleSetSecret}
                    disabled={isSettingSecret}
                  >
                    {isSettingSecret
                      ? "Activation..."
                      : "Activer le code secret"}
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
            </>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}
