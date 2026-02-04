import { defaultApiClient, type ApiClient } from "./client";
import type {
  EvaluationCompleteResponse,
  EvaluationAdvanceRequest,
  EvaluationAdvanceResponse,
  EvaluationStateResponse,
  EvaluationSession,
  StartEvaluationRequest,
  StartEvaluationResponse,
} from "./types";

const shouldLog = process.env.NEXT_PUBLIC_FLOW_DEBUG === "true";

const logEvaluationRequest = (
  label: string,
  sessionId: string,
  path: string,
  baseUrl?: string,
) => {
  if (!shouldLog) {
    return;
  }
  // eslint-disable-next-line no-console
  console.info(label, { sessionId, path, baseUrl });
};

const resolveBaseUrl = (client: ApiClient) =>
  (client as any).baseUrl;

const createIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const withIdempotencyHeader = (
  key: string,
  headers?: HeadersInit,
): HeadersInit => {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("Idempotency-Key", key);
  return nextHeaders;
};

export const startEvaluation = (
  payload: StartEvaluationRequest,
  client: ApiClient = defaultApiClient,
  idempotencyKey?: string,
) =>
  client.request<StartEvaluationResponse>("/evaluations/start", {
    method: "POST",
    body: payload,
    headers: withIdempotencyHeader(
      idempotencyKey ?? createIdempotencyKey(),
    ),
  });

export const getEvaluationState = (
  sessionId: string,
  client: ApiClient = defaultApiClient,
  idempotencyKey?: string,
) => {
  const path = `/evaluations/${encodeURIComponent(sessionId)}/state`;
  logEvaluationRequest(
    "evaluation state request",
    sessionId,
    path,
    resolveBaseUrl(client),
  );
  return client.request<EvaluationStateResponse>(
    path,
    idempotencyKey ? { headers: withIdempotencyHeader(idempotencyKey) } : {},
  );
};

export const advanceEvaluation = (
  sessionId: string,
  payload: EvaluationAdvanceRequest,
  client: ApiClient = defaultApiClient,
  idempotencyKey?: string,
) => {
  const path = `/evaluations/${encodeURIComponent(sessionId)}/advance`;
  logEvaluationRequest(
    "evaluation advance request",
    sessionId,
    path,
    resolveBaseUrl(client),
  );
  return client.request<EvaluationAdvanceResponse>(path, {
    method: "POST",
    body: payload,
    headers: withIdempotencyHeader(
      idempotencyKey ?? createIdempotencyKey(),
    ),
  });
};

export const completeEvaluation = (
  sessionId: string,
  client: ApiClient = defaultApiClient,
  idempotencyKey?: string,
) => {
  const path = `/evaluations/${encodeURIComponent(sessionId)}/complete`;
  logEvaluationRequest(
    "evaluation complete request",
    sessionId,
    path,
    resolveBaseUrl(client),
  );
  return client.request<EvaluationCompleteResponse>(path, {
    method: "POST",
    headers: withIdempotencyHeader(
      idempotencyKey ?? createIdempotencyKey(),
    ),
  });
};

export const getEvaluation = (
  sessionId: string,
  client: ApiClient = defaultApiClient,
) => {
  const path = `/evaluations/${encodeURIComponent(sessionId)}`;
  logEvaluationRequest(
    "evaluation get request",
    sessionId,
    path,
    resolveBaseUrl(client),
  );
  return client.request<EvaluationSession>(path);
};

export const getCurrentEvaluation = (
  client: ApiClient = defaultApiClient,
) => client.request<EvaluationStateResponse>("/evaluations/current");
