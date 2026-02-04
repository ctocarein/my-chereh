export type ApiClientOptions = {
  baseUrl?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  fetchFn?: typeof fetch;
};

export type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const normalizeBaseUrl = (value: string) => value.replace(/\/$/, "");
const DEFAULT_BASE_URL = "https://api.triage.carein:8443/api";
const authTokenStorageKey = "chereh_auth_token";
const legacyAccountStorageKey = "chereh_account";
const identityStorageKey = "chereh_identity";
const membershipStorageKey = "chereh_membership";
const credentialStorageKey = "chereh_credential";
const unauthenticatedEventName = "chereh:unauthenticated";
const networkErrorEventName = "chereh:network-error";
const retryRequestKey = "__cherehRetryLastRequest";
const retryRequestMetaKey = "__cherehRetryLastRequestMeta";

type RetryRequestMeta = {
  canRetry: boolean;
};

const isFormBody = (body: unknown) =>
  body instanceof FormData ||
  body instanceof URLSearchParams ||
  body instanceof Blob;

const isUnauthenticatedPayload = (data: unknown) => {
  if (typeof data === "string") {
    return data.toLowerCase().includes("unauthenticated");
  }
  if (!data || typeof data !== "object") {
    return false;
  }
  return (data as { message?: string }).message === "Unauthenticated.";
};

const clearAuthStorage = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(authTokenStorageKey);
    window.localStorage.removeItem(legacyAccountStorageKey);
    window.localStorage.removeItem(identityStorageKey);
    window.localStorage.removeItem(membershipStorageKey);
    window.localStorage.removeItem(credentialStorageKey);
  } catch {
    // Ignore storage failures.
  }
};

export class ApiClient {
  private baseUrl: string;
  private getAccessToken?: ApiClientOptions["getAccessToken"];
  private fetchFn: typeof fetch;

  constructor(options: ApiClientOptions = {}) {
    const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const resolvedBaseUrl =
      options.baseUrl ??
      (envBaseUrl?.trim() ? envBaseUrl : undefined) ??
      DEFAULT_BASE_URL;
    this.baseUrl = normalizeBaseUrl(resolvedBaseUrl);
    this.getAccessToken = options.getAccessToken;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(init.headers);
    const token = await this.getAccessToken?.();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    let body: BodyInit | undefined;
    if (init.body !== undefined) {
      if (isFormBody(init.body) || typeof init.body === "string") {
        body = init.body as BodyInit;
      } else {
        body = JSON.stringify(init.body);
        if (!headers.has("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }
      }
    }

    const canRetry =
      init.body === undefined ||
      typeof init.body === "string" ||
      !isFormBody(init.body);
    if (typeof window !== "undefined") {
      try {
        (window as Window & { [key: string]: unknown })[retryRequestMetaKey] = {
          canRetry,
        } satisfies RetryRequestMeta;
        if (canRetry) {
          (window as Window & { [key: string]: unknown })[retryRequestKey] = () =>
            this.request(path, init);
        } else {
          (window as Window & { [key: string]: unknown })[retryRequestKey] =
            undefined;
        }
      } catch {
        // Ignore storage failures.
      }
    }

    let response: Response;
    try {
      response = await this.fetchFn.call(globalThis, url, {
        ...init,
        headers,
        body,
      });
    } catch (error) {
      if (typeof window !== "undefined") {
        try {
          const guard = "__cherehNetworkErrorNotified";
          const alreadyNotified = (window as Window & { [key: string]: boolean })[
            guard
          ];
          if (!alreadyNotified) {
            (window as Window & { [key: string]: boolean })[guard] = true;
            const meta =
              (window as Window & { [key: string]: RetryRequestMeta | undefined })[
                retryRequestMetaKey
              ];
            window.dispatchEvent(
              new CustomEvent(networkErrorEventName, {
                detail: { canRetry: meta?.canRetry === true },
              }),
            );
            window.setTimeout(() => {
              (window as Window & { [key: string]: boolean })[guard] = false;
            }, 3000);
          }
        } catch {
          // Ignore notification failures.
        }
      }
      throw error;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      if (
        response.status === 401 ||
        isUnauthenticatedPayload(data)
      ) {
        clearAuthStorage();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(unauthenticatedEventName));
        }
      }
      throw new ApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        data,
      );
    }

    return data as T;
  }
}

export const createApiClient = (options?: ApiClientOptions) =>
  new ApiClient(options);

const readStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(authTokenStorageKey);
  } catch {
    return null;
  }
};

export const defaultApiClient = new ApiClient({
  getAccessToken: readStoredToken,
});
