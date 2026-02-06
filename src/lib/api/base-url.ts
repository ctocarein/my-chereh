const DEFAULT_API_BASE_URL = "https://api.triage.carein:8443/api";

export const normalizeBaseUrl = (value: string) => value.replace(/\/$/, "");

const normalizeEnv = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? normalizeBaseUrl(trimmed) : undefined;
};

export const getPublicApiBaseUrl = () =>
  normalizeEnv(process.env.NEXT_PUBLIC_API_BASE_URL) ??
  normalizeBaseUrl(DEFAULT_API_BASE_URL);

export const getServerApiBaseUrl = () =>
  normalizeEnv(process.env.API_BASE_URL) ??
  normalizeEnv(process.env.NEXT_PRIVATE_API_BASE_URL) ??
  normalizeEnv(process.env.NEXT_PUBLIC_API_BASE_URL) ??
  normalizeBaseUrl(DEFAULT_API_BASE_URL);
