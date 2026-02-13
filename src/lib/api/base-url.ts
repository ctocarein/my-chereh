const DEFAULT_SERVER_API_BASE_URL = "https://triage.carein.cloud/api";
const DEFAULT_PUBLIC_API_BASE_URL = DEFAULT_SERVER_API_BASE_URL;

export const normalizeBaseUrl = (value: string) => value.replace(/\/$/, "");

const normalizeEnv = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? normalizeBaseUrl(trimmed) : undefined;
};

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

export const getPublicApiBaseUrl = () =>
  normalizeEnv(process.env.NEXT_PUBLIC_API_BASE_URL) ??
  normalizeBaseUrl(DEFAULT_PUBLIC_API_BASE_URL);

export const getServerApiBaseUrl = () => {
  const privateBaseUrl =
    normalizeEnv(process.env.API_BASE_URL) ??
    normalizeEnv(process.env.NEXT_PRIVATE_API_BASE_URL);
  if (privateBaseUrl) {
    return privateBaseUrl;
  }

  const publicBaseUrl = normalizeEnv(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (publicBaseUrl && isHttpUrl(publicBaseUrl)) {
    return publicBaseUrl;
  }

  return normalizeBaseUrl(DEFAULT_SERVER_API_BASE_URL);
};
