export type SessionIds = {
  internalId: string | null;
  publicId: string | null;
};

const looksLikeUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const coerceId = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
};

export const extractSessionIds = (payload: unknown): SessionIds => {
  if (!payload || typeof payload !== "object") {
    return { internalId: null, publicId: null };
  }

  const record = payload as Record<string, unknown>;
  const session = record.session as Record<string, unknown> | undefined;

  const rawInternal =
    session?.evaluation_session_id ??
    session?.evaluationSessionId ??
    record.evaluation_session_id ??
    record.evaluationSessionId ??
    record.session_id ??
    record.sessionId ??
    null;
  const rawSessionId = session?.id ?? null;
  const rawPublic =
    session?.public_id ??
    session?.publicId ??
    record.public_id ??
    record.publicId ??
    null;

  const internalId = coerceId(rawInternal ?? rawSessionId);
  const publicId = coerceId(rawPublic);

  if (internalId && looksLikeUuid(internalId) && !publicId) {
    return { internalId: null, publicId: internalId };
  }

  if (publicId && looksLikeUuid(publicId)) {
    return { internalId, publicId };
  }

  if (rawSessionId && looksLikeUuid(String(rawSessionId))) {
    return { internalId: coerceId(rawInternal), publicId: String(rawSessionId) };
  }

  return { internalId, publicId };
};

export const pickInternalSessionId = (ids: SessionIds): string | null =>
  ids.internalId ?? null;

export const pickPublicSessionId = (ids: SessionIds): string | null =>
  ids.publicId ?? ids.internalId ?? null;
