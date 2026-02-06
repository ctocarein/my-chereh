import { redirect } from "next/navigation";
import { getServerApiBaseUrl } from "@/lib/api/base-url";

type PageProps = {
  params?: Promise<{
    code?: string | string[];
  }>;
};

const buildReferralApiUrl = (code: string) => {
  return `${getServerApiBaseUrl()}/r/${encodeURIComponent(code)}`;
};

export default async function ReferralRedirectPage({ params }: PageProps) {
  const resolvedParams = params ? await params : undefined;
  const rawCode = resolvedParams?.code;
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;

  if (!code) {
    // eslint-disable-next-line no-console
    console.info("[referral] missing code param");
    redirect("/");
  }

  const apiUrl = buildReferralApiUrl(code);
  try {
    const apiRes = await fetch(apiUrl, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
    });

    if (apiRes.status === 302) {
      const location = apiRes.headers.get("Location");
      if (location) {
        redirect(location);
      }
    }

    if (apiRes.status === 410 || apiRes.status === 404) {
      redirect("/referrals/expired");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      // Let Next.js handle redirect exceptions.
      throw error;
    }
  }

  redirect("/");
}
