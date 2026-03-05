import { defaultApiClient, type ApiClient } from "./client";
import type { Report } from "./types";

export const listReports = async (
  client: ApiClient = defaultApiClient,
): Promise<Report[]> => {
  const res = await client.request<{ data: Report[] } | Report[]>("/reports");
  return Array.isArray(res) ? res : res.data;
};

export const getReport = async (
  reportId: string | number,
  client: ApiClient = defaultApiClient,
): Promise<Report> => {
  const res = await client.request<{ data: Report } | Report>(
    `/reports/${encodeURIComponent(String(reportId))}`,
  );
  return "data" in res ? res.data : res;
};
