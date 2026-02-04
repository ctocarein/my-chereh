import { defaultApiClient, type ApiClient } from "./client";
import type { Answer, AnswerInput } from "./types";

export const listAnswers = (
  sessionPublicId: string,
  client: ApiClient = defaultApiClient,
) =>
  client.request<Answer[]>(
    `/answers/session/${encodeURIComponent(sessionPublicId)}`,
  );

export const storeAnswer = (
  payload: AnswerInput,
  client: ApiClient = defaultApiClient,
) =>
  client.request<Answer>("/answers", {
    method: "POST",
    body: payload,
  });

export const deleteAnswer = (
  id: string,
  client: ApiClient = defaultApiClient,
) =>
  client.request<void>(`/answers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
