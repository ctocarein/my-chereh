import { defaultApiClient, type ApiClient } from "./client";
import type { OrganizationResponse } from "./types";

export const getDefaultOrganization = (
  client: ApiClient = defaultApiClient,
) => client.request<OrganizationResponse>("/organizations/default");
