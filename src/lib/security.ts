import type { SecurityGate } from "@/lib/api/types";

const deviceStorageKey = "chereh_device_fingerprint";
const gateStorageKey = "chereh_security_gate";
const secretStorageKey = "chereh_secret_set";

const hasSecretIndicator = (gate?: SecurityGate | null) =>
  Boolean(
    gate?.pin_enabled ||
      gate?.secret_set ||
      gate?.secret_set_at,
  );

export const getDeviceFingerprint = () => {
  if (typeof window === "undefined") {
    return "server";
  }

  try {
    const existing = window.localStorage.getItem(deviceStorageKey);
    if (existing) {
      return existing;
    }

    const fingerprint =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(deviceStorageKey, fingerprint);
    return fingerprint;
  } catch {
    return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

export const readSecurityGate = (): SecurityGate | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(gateStorageKey);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SecurityGate;
  } catch {
    return null;
  }
};

export const storeSecurityGate = (gate: SecurityGate | null) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (!gate) {
      window.localStorage.removeItem(gateStorageKey);
      return;
    }
    window.localStorage.setItem(gateStorageKey, JSON.stringify(gate));
    if (hasSecretIndicator(gate)) {
      window.localStorage.setItem(secretStorageKey, "1");
    }
  } catch {
    // Ignore storage failures.
  }
};

export const markSecretSet = () => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(secretStorageKey, "1");
  } catch {
    // Ignore storage failures.
  }
};

export const readSecretSet = () => {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(secretStorageKey) === "1";
  } catch {
    return false;
  }
};

export const isSecretSet = (gate?: SecurityGate | null) =>
  hasSecretIndicator(gate) || readSecretSet();

export const isGateLocked = (gate?: SecurityGate | null) => {
  if (!gate) {
    return false;
  }
  const state = gate.state?.toLowerCase();
  if (state === "locked") {
    return true;
  }
  if (gate.panic_locked_at) {
    return true;
  }
  if (gate.locked_until) {
    const lockedUntil =
      typeof gate.locked_until === "number"
        ? gate.locked_until
        : Date.parse(gate.locked_until);
    if (!Number.isNaN(lockedUntil) && lockedUntil > Date.now()) {
      return true;
    }
  }
  return false;
};

export const isGateRequired = (gate?: SecurityGate | null) => {
  if (!gate) {
    return false;
  }
  if (isGateLocked(gate)) {
    return true;
  }
  if (gate.gate_required === true) {
    return true;
  }
  const state = gate.state?.toLowerCase();
  return state === "limited" || state === "restricted";
};
