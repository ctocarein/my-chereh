const DEFAULT_SERVER_API_BASE_URL = "https://triage.carein.cloud/api";
const DEFAULT_PUBLIC_API_BASE_URL = "/api/proxy";

export const normalizeBaseUrl = (value: string) => value.replace(/\/$/, "");

const normalizeEnv = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? normalizeBaseUrl(trimmed) : undefined;
};

export const getPublicApiBaseUrl = () =>
  normalizeEnv(process.env.NEXT_PUBLIC_API_BASE_URL) ??
  normalizeBaseUrl(DEFAULT_PUBLIC_API_BASE_URL);

export const getServerApiBaseUrl = () =>
  normalizeEnv(process.env.API_BASE_URL) ??
  normalizeEnv(process.env.NEXT_PRIVATE_API_BASE_URL) ??
  normalizeEnv(process.env.NEXT_PUBLIC_API_BASE_URL) ??
  normalizeBaseUrl(DEFAULT_SERVER_API_BASE_URL);
