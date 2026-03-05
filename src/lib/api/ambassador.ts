import { defaultApiClient, type ApiClient } from "./client";
import type { AmbassadorReferralResponse } from "./types";

export const generateReferralLink = (
  channel: "whatsapp" | "sms" | "qr" | "other",
  client: ApiClient = defaultApiClient,
): Promise<AmbassadorReferralResponse> =>
  client.request<AmbassadorReferralResponse>("/ambassador/referrals", {
    method: "POST",
    body: { channel },
  });
