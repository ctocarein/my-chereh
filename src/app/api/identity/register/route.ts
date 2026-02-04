const normalizeBaseUrl = (value: string) => value.replace(/\/$/, "");

const resolveApiBaseUrl = () =>
  normalizeBaseUrl(
    process.env.API_BASE_URL ??
      process.env.NEXT_PRIVATE_API_BASE_URL ??
      "https://api.triage.carein:8443/api",
  );

const forwardRequest = async (request: Request, path: string) => {
  const url = `${resolveApiBaseUrl()}${path}`;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const body = await request.arrayBuffer();
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
};

export const POST = (request: Request) =>
  forwardRequest(request, "/identity/register");

export const OPTIONS = () =>
  new Response(null, {
    status: 204,
  });
