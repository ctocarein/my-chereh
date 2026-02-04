"use client";

import { useEffect, useState } from "react";

export default function NetworkErrorToast() {
  const [isVisible, setIsVisible] = useState(false);
  const [canRetry, setCanRetry] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    const handleNetworkError = (event: Event) => {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as { canRetry?: boolean } | undefined)
          : undefined;
      setCanRetry(detail?.canRetry !== false);
      setIsVisible(true);
      setRetryError(null);
    };

    window.addEventListener("chereh:network-error", handleNetworkError);
    return () => {
      window.removeEventListener("chereh:network-error", handleNetworkError);
    };
  }, []);

  const handleRetry = async () => {
    if (typeof window === "undefined") {
      return;
    }
    setRetryError(null);
    setIsRetrying(true);
    try {
      const retryFn = (window as Window & { [key: string]: unknown })[
        "__cherehRetryLastRequest"
      ];
      if (typeof retryFn === "function") {
        await retryFn();
        setIsVisible(false);
      } else {
        window.location.reload();
      }
    } catch {
      setRetryError("Echec de la tentative. Verifiez le reseau puis reessayez.");
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        left: "16px",
        right: "16px",
        bottom: "16px",
        zIndex: 50,
      }}
    >
      <div
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "14px 16px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>
            Probleme de connexion
          </p>
          <p style={{ marginTop: "6px", color: "var(--muted)" }}>
            Verifiez votre reseau puis reessayez.
          </p>
          {retryError ? (
            <p style={{ marginTop: "6px", color: "var(--danger)" }}>
              {retryError}
            </p>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying
              ? "Reessai..."
              : canRetry
                ? "Reessayer"
                : "Recharger"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsVisible(false)}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
