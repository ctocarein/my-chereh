const referralStorageKey = "chereh_referral_code";

const normalizeReferralCode = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const extractReferralCode = (
  params?: URLSearchParams | null,
) => {
  if (!params) {
    return null;
  }
  const raw = params.get("ref") ?? params.get("referral");
  return normalizeReferralCode(raw);
};

export const storeReferralCode = (code: string) => {
  if (typeof window === "undefined") {
    return;
  }
  const normalized = normalizeReferralCode(code);
  if (!normalized) {
    return;
  }
  try {
    window.localStorage.setItem(referralStorageKey, normalized);
  } catch {
    // Ignore storage failures.
  }
};

export const readStoredReferralCode = () => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return normalizeReferralCode(
      window.localStorage.getItem(referralStorageKey),
    );
  } catch {
    return null;
  }
};

export const clearStoredReferralCode = () => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(referralStorageKey);
  } catch {
    // Ignore storage failures.
  }
};

export const captureReferralFromSearchParams = (
  params?: URLSearchParams | null,
) => {
  const code = extractReferralCode(params);
  if (code) {
    storeReferralCode(code);
  }
  return code;
};

import { getPublicApiBaseUrl, normalizeBaseUrl } from "@/lib/api/base-url";

export const getReferralBaseUrl = () => {
  const envBase = process.env.NEXT_PUBLIC_REFERRAL_BASE_URL?.trim();
  if (envBase) {
    return normalizeBaseUrl(envBase);
  }

  return normalizeBaseUrl("https://triage.carein.cloud");
};

export const buildReferralUrl = (code: string) => {
  const base = getReferralBaseUrl();
  if (!base) {
    return "";
  }
  const path = process.env.NEXT_PUBLIC_REFERRAL_PATH?.trim();
  const normalizedPath = path ? `/${path.replace(/^\/+/, "")}` : "/r";
  return `${base}${normalizedPath}/${encodeURIComponent(code)}`;
};
