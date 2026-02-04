import { defaultApiClient, type ApiClient } from "./client";
import type { UploadResponse } from "./types";

export const uploadEvaluationFile = (
  file: File,
  client: ApiClient = defaultApiClient,
) => {
  const formData = new FormData();
  formData.append("file", file);
  return client.request<UploadResponse>("/uploads", {
    method: "POST",
    body: formData,
  });
};
