import { defaultApiClient, type ApiClient } from "./client";
import type { Report } from "./types";

export const listReports = (
  client: ApiClient = defaultApiClient,
) => client.request<Report[]>("/reports");

export const getReport = (
  reportId: string,
  client: ApiClient = defaultApiClient,
) =>
  client.request<Report>(
    `/reports/${encodeURIComponent(reportId)}`,
  );
