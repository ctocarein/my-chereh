import { defaultApiClient, type ApiClient } from "./client";
import type { Answer } from "./types";

export const listAnswers = (
  sessionPublicId: string,
  client: ApiClient = defaultApiClient,
) =>
  client.request<Answer[]>(
    `/answers/session/${encodeURIComponent(sessionPublicId)}`,
  );
