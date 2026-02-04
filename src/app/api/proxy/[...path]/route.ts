const normalizeBaseUrl = (value: string) => value.replace(/\/$/, "");

const resolveApiBaseUrl = () =>
  normalizeBaseUrl(
    process.env.API_BASE_URL ??
      process.env.NEXT_PRIVATE_API_BASE_URL ??
      "https://api.triage.carein:8443/api",
  );

const getPathFromRequest = (request: Request) => {
  const { pathname } = new URL(request.url);
  const prefix = "/api/proxy";
  if (!pathname.startsWith(prefix)) {
    return "/";
  }
  const remainder = pathname.slice(prefix.length);
  return remainder.length ? remainder : "/";
};

if (process.env.ALLOW_SELF_SIGNED_CERTS === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const forwardRequest = async (request: Request, pathSegments?: string[]) => {
  const path = pathSegments?.length
    ? `/${pathSegments.join("/")}`
    : getPathFromRequest(request);
  const url = `${resolveApiBaseUrl()}${path}`;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("connection");
  headers.delete("accept-encoding");

  const body = await request.arrayBuffer();

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: body.byteLength ? body : undefined,
      cache: "no-store",
    });

    const responseBody = await response.arrayBuffer();
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    // Surface upstream failures in dev logs and return a helpful payload.
    // eslint-disable-next-line no-console
    console.error("API proxy error", { url, error });
    return new Response(
      JSON.stringify({
        error: "upstream_fetch_failed",
        message: "API proxy failed to reach upstream service.",
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};

type RouteContext = {
  params?:
    | Promise<{
        path?: string[];
      }>
    | {
        path?: string[];
      };
};

const handle = async (request: Request, context: RouteContext) => {
  const resolvedParams = await Promise.resolve(context.params);
  return forwardRequest(request, resolvedParams?.path);
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = () =>
  new Response(null, {
    status: 204,
  });
