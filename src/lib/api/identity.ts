import { defaultApiClient, type ApiClient } from "./client";
import type {
  Identity,
  IdentityMedicalProfile,
  IdentityMembership,
  IdentityPersonalProfile,
  LoginIdentityRequest,
  LoginIdentityResponse,
  RegisterIdentityRequest,
  RegisterIdentityResponse,
  SecurityGate,
  SecurityGateResponse,
  SetIdentitySecretRequest,
  UnlockIdentityRequest,
} from "./types";

export const registerIdentity = (
  payload: RegisterIdentityRequest,
  client: ApiClient = defaultApiClient,
) =>
  client.request<RegisterIdentityResponse>("/identity/register", {
    method: "POST",
    body: payload,
  });

export const loginIdentity = (
  payload: LoginIdentityRequest,
  client: ApiClient = defaultApiClient,
) =>
  client.request<LoginIdentityResponse>("/identity/login", {
    method: "POST",
    body: payload,
  });

export const logoutIdentity = (client: ApiClient = defaultApiClient) =>
  client.request<void>("/identity/logout");

export const setIdentitySecret = (
  payload: SetIdentitySecretRequest,
  client: ApiClient = defaultApiClient,
) =>
  client.request<SecurityGateResponse>("/identity/secret", {
    method: "PATCH",
    body: payload,
  });

export const unlockIdentity = (
  payload: UnlockIdentityRequest,
  client: ApiClient = defaultApiClient,
) =>
  client.request<SecurityGateResponse>("/identity/unlock", {
    method: "POST",
    body: payload,
  });

export const panicLockIdentity = (client: ApiClient = defaultApiClient) =>
  client.request<SecurityGateResponse>("/identity/panic-lock", {
    method: "POST",
  });

export const getSecurityStatus = async (
  deviceFingerprint?: string,
  client: ApiClient = defaultApiClient,
): Promise<SecurityGate> => {
  const query = deviceFingerprint
    ? `?device_fingerprint=${encodeURIComponent(deviceFingerprint)}`
    : "";
  const response = await client.request<SecurityGateResponse>(
    `/identity/security/status${query}`,
  );
  return response.security_gate ?? response;
};

export const listIdentities = (client: ApiClient = defaultApiClient) =>
  client.request<Identity[]>("/identity");

export const createIdentity = (
  payload: Record<string, unknown>,
  client: ApiClient = defaultApiClient,
) =>
  client.request<Identity>("/identity", {
    method: "POST",
    body: payload,
  });

export const getCurrentIdentity = (client: ApiClient = defaultApiClient) =>
  client.request<Identity>("/identity/me");

export const getIdentity = (
  identityId: string,
  client: ApiClient = defaultApiClient,
) =>
  client.request<Identity>(
    `/identity/${encodeURIComponent(identityId)}`,
  );

export const updateIdentity = (
  identityId: string,
  payload: Record<string, unknown>,
  client: ApiClient = defaultApiClient,
) =>
  client.request<Identity>(
    `/identity/${encodeURIComponent(identityId)}`,
    {
      method: "PATCH",
      body: payload,
    },
  );

export const deactivateIdentity = (
  identityId: string,
  client: ApiClient = defaultApiClient,
) =>
  client.request<void>(
    `/identity/${encodeURIComponent(identityId)}`,
    {
      method: "DELETE",
    },
  );

export const listMemberships = (client: ApiClient = defaultApiClient) =>
  client.request<IdentityMembership[]>("/identity/memberships");

export const createMembership = (
  payload: Record<string, unknown>,
  client: ApiClient = defaultApiClient,
) =>
  client.request<IdentityMembership>("/identity/memberships", {
    method: "POST",
    body: payload,
  });

export const getMembership = (
  membershipId: string,
  client: ApiClient = defaultApiClient,
) =>
  client.request<IdentityMembership>(
    `/identity/memberships/${encodeURIComponent(membershipId)}`,
  );

export const updateMembership = (
  membershipId: string,
  payload: Record<string, unknown>,
  client: ApiClient = defaultApiClient,
) =>
  client.request<IdentityMembership>(
    `/identity/memberships/${encodeURIComponent(membershipId)}`,
    {
      method: "PATCH",
      body: payload,
    },
  );

export const deactivateMembership = (
  membershipId: string,
  client: ApiClient = defaultApiClient,
) =>
  client.request<void>(
    `/identity/memberships/${encodeURIComponent(membershipId)}`,
    {
      method: "DELETE",
    },
  );

export const getMedicalProfile = (
  client: ApiClient = defaultApiClient,
) => client.request<IdentityMedicalProfile>("/identity/profile/medical");

export const createMedicalProfile = (
  payload: Record<string, unknown>,
  client: ApiClient = defaultApiClient,
) =>
  client.request<IdentityMedicalProfile>("/identity/profile/medical", {
    method: "POST",
    body: payload,
  });

export const updateMedicalProfile = (
  payload: Record<string, unknown>,
  client: ApiClient = defaultApiClient,
) =>
  client.request<IdentityMedicalProfile>("/identity/profile/medical", {
    method: "PUT",
    body: payload,
  });

export const getPersonalProfile = (
  client: ApiClient = defaultApiClient,
) => client.request<IdentityPersonalProfile>("/identity/profile/personal");

export const createPersonalProfile = (
  payload: Record<string, unknown>,
  client: ApiClient = defaultApiClient,
) =>
  client.request<IdentityPersonalProfile>("/identity/profile/personal", {
    method: "POST",
    body: payload,
  });

export const updatePersonalProfile = (
  payload: Record<string, unknown>,
  client: ApiClient = defaultApiClient,
) =>
  client.request<IdentityPersonalProfile>("/identity/profile/personal", {
    method: "PUT",
    body: payload,
  });
