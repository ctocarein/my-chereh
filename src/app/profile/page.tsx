"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import RequireAuth from "@/components/auth/RequireAuth";
import {
  getCurrentEvaluation,
  getEvaluationState,
  // listEvaluations,
  startEvaluation,
} from "@/lib/api/evaluations";
import { extractSessionIds, pickInternalSessionId } from "@/lib/api/session";
import {
  getCurrentIdentity,
  getMedicalProfile,
  getPersonalProfile,
  getSecurityStatus,
  logoutIdentity,
} from "@/lib/api/identity";
import type {
  EvaluationQuestion,
  SecurityGate,
  StartEvaluationResponse,
} from "@/lib/api/types";
import { readStoredReferralCode } from "@/lib/referral";
import {
  getDeviceFingerprint,
  isGateLocked,
  isGateRequired,
  readSecurityGate,
  storeSecurityGate,
} from "@/lib/security";

type StoredFlowState = {
  version?: number;
  answers?: unknown[];
  messages?: StoredMessage[];
  questionHistory?: unknown[];
  isComplete?: boolean;
  sessionId?: string | null;
  sessionInternalId?: string | null;
  sessionPublicId?: string | null;
  completionMessage?: string | null;
  ownerId?: string | null;
};

type StoredMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  stepIndex?: number;
  timestamp?: number;
};

type EvaluationMetrics = {
  progressPercent?: number;
  remainingQuestions?: number | null;
  isComplete?: boolean;
  isFirstEvaluation?: boolean;
};

const flowStorageKey = "evaluation-flow-v1";
const defaultCompletionPrompt =
  "Merci. Je prepare une orientation claire et rassurante.";
const evaluationType =
  process.env.NEXT_PUBLIC_EVALUATION_TYPE ?? "complete";
const shouldLog = process.env.NEXT_PUBLIC_FLOW_DEBUG === "true";
const parseBlocKeys = (raw?: string) => {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated values.
  }

  return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
};

const configuredBlocKeys = parseBlocKeys(
  process.env.NEXT_PUBLIC_EVALUATION_BLOC_KEYS,
);
const evaluationBlocKeys = configuredBlocKeys;
const evaluationContext = (() => {
  const raw = process.env.NEXT_PUBLIC_EVALUATION_CONTEXT;
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
})();

const mapQuestionType = (value?: string) => {
  const normalized = value?.toLowerCase().trim();
  switch (normalized) {
    case "select":
    case "select_one":
    case "single":
      return "select_one";
    case "multi_select":
    case "select_multiple":
    case "multiple":
      return "select_multiple";
    case "boolean":
    case "yes_no":
      return "boolean";
    case "number":
    case "numeric":
      return "number";
    case "date":
      return "date";
    case "time":
      return "time";
    case "slider":
      return "slider";
    case "rating":
      return "rating";
    case "file":
      return "file";
    case "image":
      return "image";
    case "audio":
      return "audio";
    case "video":
      return "video";
    case "location":
      return "location";
    case "info":
      return "info";
    case "custom":
      return "custom";
    default:
      return "text";
  }
};

const normalizeStoredQuestion = (question: EvaluationQuestion) => {
  const rawId = question.id ?? question.key ?? "question";
  const id = String(rawId);
  const key = question.key ? String(question.key) : id;
  const text =
    question.text ??
    (question as { label?: string }).label ??
    "";

  return {
    ...question,
    id,
    key,
    text,
    type: mapQuestionType(question.type),
  };
};

const getQuestionText = (question: { text?: string; prompt?: string }) =>
  question.text || question.prompt || "";

const createMessage = (text: string, stepIndex = 0): StoredMessage => ({
  id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role: "bot",
  text,
  stepIndex,
  timestamp: Date.now(),
});

const createIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const looksLikeUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const resolveStoredSessionIds = (stored: StoredFlowState | null) => {
  const internalId = stored?.sessionInternalId ?? null;
  const publicId = stored?.sessionPublicId ?? null;
  if (internalId || publicId) {
    return { internalId, publicId };
  }
  const fallback = stored?.sessionId ? String(stored.sessionId) : null;
  if (!fallback) {
    return { internalId: null, publicId: null };
  }
  if (looksLikeUuid(fallback)) {
    return { internalId: null, publicId: fallback };
  }
  return { internalId: fallback, publicId: null };
};

const extractEvaluationQuestion = (payload: {
  question?: EvaluationQuestion | null;
  currentQuestion?: EvaluationQuestion | null;
  session?: {
    current_question?: EvaluationQuestion | null;
    currentQuestion?: EvaluationQuestion | null;
  };
}) =>
  payload.question ??
  payload.currentQuestion ??
  payload.session?.current_question ??
  payload.session?.currentQuestion ??
  null;

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
};

const normalizeProfilePayload = (
  payload: unknown,
): Record<string, unknown> | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const nested =
    (record.data as Record<string, unknown> | undefined) ??
    (record.profile as Record<string, unknown> | undefined);
  if (nested && typeof nested === "object") {
    return nested;
  }
  return record;
};

const hasProfileData = (payload: Record<string, unknown> | null) =>
  Boolean(payload && Object.keys(payload).length > 0);

const resolveDisplayName = (
  identity: Record<string, unknown> | null,
  personal: Record<string, unknown> | null,
) => {
  const pick = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

  const identityName =
    pick(identity?.name) ||
    pick(identity?.full_name) ||
    pick(identity?.fullName);
  if (identityName) {
    return identityName;
  }

  const firstName =
    pick(identity?.first_name) ||
    pick(identity?.firstName) ||
    pick(personal?.first_name) ||
    pick(personal?.firstName);
  const lastName =
    pick(identity?.last_name) ||
    pick(identity?.lastName) ||
    pick(personal?.last_name) ||
    pick(personal?.lastName);
  const combined = `${firstName} ${lastName}`.trim();
  if (combined) {
    return combined;
  }

  const personalName =
    pick(personal?.name) ||
    pick(personal?.full_name) ||
    pick(personal?.fullName);
  return personalName || "";
};

const getProfileInitial = (name: string, fallback?: string) => {
  const trimmed = name.trim();
  if (!trimmed) {
    const fallbackTrimmed = fallback?.trim() ?? "";
    return fallbackTrimmed ? fallbackTrimmed[0]?.toUpperCase() ?? null : null;
  }
  return trimmed[0]?.toUpperCase() ?? null;
};

const formatDate = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("fr-FR");
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "Oui" : "Non";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "—";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "—";
    }
    const formattedDate = formatDate(trimmed);
    return formattedDate || trimmed;
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "—";
  }
  return "—";
};

const normalizePercent = (value: number) =>
  clampPercent(value <= 1 ? value * 100 : value);

const pickNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
};

const readStoredFlowState = (): StoredFlowState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(flowStorageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredFlowState;
    if (parsed?.version === 3 || parsed?.version === 4) {
      return parsed;
    }
  } catch {
    // Ignore malformed storage payloads.
  }

  return null;
};

const resolveMetricsFromStored = (
  stored: StoredFlowState | null,
): EvaluationMetrics => {
  if (!stored) {
    return {};
  }

  const answersCount = Array.isArray(stored.answers) ? stored.answers.length : 0;
  const questionCount = Array.isArray(stored.questionHistory)
    ? stored.questionHistory.length
    : 0;
  const hasCurrentQuestion = questionCount > answersCount;
  const denominator = answersCount + (hasCurrentQuestion ? 1 : 0);
  const isComplete = Boolean(stored.isComplete);
  const progressPercent = isComplete
    ? 100
    : denominator > 0
      ? normalizePercent(answersCount / denominator)
      : 0;

  return { progressPercent, isComplete };
};

const resolveMetricsFromState = (state: unknown): EvaluationMetrics => {
  if (!state || typeof state !== "object") {
    return {};
  }

  const stateRecord = state as Record<string, unknown>;
  const session = (stateRecord.session ?? {}) as Record<string, unknown>;
  const insight = (stateRecord.insight ?? {}) as Record<string, unknown>;
  const isComplete =
    stateRecord.isComplete === true || session.status === "completed";
  const isFirstEvaluation =
    stateRecord.is_first_evaluation === true ||
    session.is_first_evaluation === true ||
    session.first_evaluation === true;

  const progressRaw = pickNumber(
    stateRecord.progress_percent,
    stateRecord.progressPercent,
    stateRecord.completion_percent,
    stateRecord.completion_percentage,
    stateRecord.progress,
    stateRecord.completion,
    insight.progress_percent,
    insight.progressPercent,
    insight.completion_percent,
    insight.completion_percentage,
    insight.progress,
    insight.completion,
    session.progress_percent,
    session.progressPercent,
    session.completion_percent,
    session.completion_percentage,
    session.progress,
    session.completion,
  );

  const totalRaw = pickNumber(
    stateRecord.total_questions,
    stateRecord.totalQuestions,
    insight.total_questions,
    insight.totalQuestions,
    session.total_questions,
    session.totalQuestions,
  );

  const answeredRaw = pickNumber(
    stateRecord.answered_questions,
    stateRecord.answeredQuestions,
    insight.answered_questions,
    insight.answeredQuestions,
    session.answered_questions,
    session.answeredQuestions,
  );

  const remainingRaw = pickNumber(
    stateRecord.remaining_questions,
    stateRecord.remainingQuestions,
    insight.remaining_questions,
    insight.remainingQuestions,
    session.remaining_questions,
    session.remainingQuestions,
  );

  let progressPercent =
    progressRaw !== undefined ? normalizePercent(progressRaw) : undefined;

  if (
    progressPercent === undefined &&
    answeredRaw !== undefined &&
    totalRaw !== undefined &&
    totalRaw > 0
  ) {
    progressPercent = normalizePercent(answeredRaw / totalRaw);
  }

  if (progressPercent === undefined && isComplete) {
    progressPercent = 100;
  }

  let remainingQuestions =
    remainingRaw !== undefined ? Math.max(0, Math.round(remainingRaw)) : undefined;

  if (
    remainingQuestions === undefined &&
    answeredRaw !== undefined &&
    totalRaw !== undefined
  ) {
    remainingQuestions = Math.max(0, Math.round(totalRaw - answeredRaw));
  }

  if (remainingQuestions === undefined && isComplete) {
    remainingQuestions = 0;
  }

  return { progressPercent, remainingQuestions, isComplete, isFirstEvaluation };
};

export default function ProfilePage() {
  const router = useRouter();
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [remainingQuestions, setRemainingQuestions] = useState<number | null>(
    null,
  );
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingEvaluation, setIsStartingEvaluation] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isFirstEvaluation, setIsFirstEvaluation] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [personalProfile, setPersonalProfile] = useState<Record<string, unknown> | null>(
    null,
  );
  const [medicalProfile, setMedicalProfile] = useState<Record<string, unknown> | null>(
    null,
  );
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [securityGate, setSecurityGate] = useState<SecurityGate | null>(null);
  const [isGateLoading, setIsGateLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const profileInitial = useMemo(() => {
    const firstName =
      typeof personalProfile?.first_name === "string"
        ? personalProfile.first_name
        : "";
    return getProfileInitial(firstName, displayName);
  }, [displayName, personalProfile]);

  useEffect(() => {
    let isActive = true;
    const stored = readStoredFlowState();
    const storedIds = resolveStoredSessionIds(stored);
    const storedEvaluationId = pickInternalSessionId(storedIds);
    const storedMetrics = resolveMetricsFromStored(stored);

    if (storedMetrics.progressPercent !== undefined) {
      setEvaluationProgress(storedMetrics.progressPercent);
    }
    if (storedMetrics.isComplete !== undefined) {
      setIsComplete(storedMetrics.isComplete);
    }
    setHasActiveSession(Boolean(storedEvaluationId));

    const loadEvaluationState = async () => {
      const sessionId = storedEvaluationId;

      try {
        const state = sessionId
          ? await getEvaluationState(sessionId)
          : await getCurrentEvaluation();
        if (!isActive) {
          return;
        }
        const metrics = resolveMetricsFromState(state);
        if (metrics.progressPercent !== undefined) {
          setEvaluationProgress(metrics.progressPercent);
        }
        if (metrics.remainingQuestions !== undefined) {
          setRemainingQuestions(metrics.remainingQuestions);
        }
        if (metrics.isComplete !== undefined) {
          setIsComplete(metrics.isComplete);
        }
        if (metrics.isFirstEvaluation !== undefined) {
          setIsFirstEvaluation(metrics.isFirstEvaluation);
        } else {
          setIsFirstEvaluation(false);
        }
        if (shouldLog) {
          // eslint-disable-next-line no-console
          console.info("evaluation state is_first_evaluation", {
            api: metrics.isFirstEvaluation,
            fallback: !hasActiveSession && evaluationProgress === 0 && !isComplete,
          });
        }
        const resolvedSessionIds = extractSessionIds(
          state as StartEvaluationResponse,
        );
        const resolvedSessionId =
          sessionId ?? pickInternalSessionId(resolvedSessionIds);
        if (resolvedSessionId) {
          setHasActiveSession(true);
        }
      } catch (error) {
        if (shouldLog) {
          // eslint-disable-next-line no-console
          console.info("profile evaluation state error", error);
        }
        // Ignore errors and keep stored fallback.
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    const loadProfiles = async () => {
      try {
        const [identity, personal, medical] = await Promise.all([
          getCurrentIdentity().catch(() => null),
          getPersonalProfile().catch(() => null),
          getMedicalProfile().catch(() => null),
        ]);
        if (!isActive) {
          return;
        }
        if (identity?.id !== undefined && identity?.id !== null) {
          setIdentityId(String(identity.id));
        }
        const personalProfileValue = normalizeProfilePayload(personal);
        const medicalProfileValue = normalizeProfilePayload(medical);
        setPersonalProfile(personalProfileValue);
        setMedicalProfile(medicalProfileValue);
        setDisplayName(
          resolveDisplayName(
            normalizeProfilePayload(identity),
            personalProfileValue,
          ),
        );
      } finally {
        if (isActive) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadEvaluationState();
    void loadProfiles();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const storedGate = readSecurityGate();
    if (storedGate) {
      setSecurityGate(storedGate);
    }

    const loadSecurityGate = async () => {
      try {
        const gate = await getSecurityStatus(getDeviceFingerprint());
        if (!isActive) {
          return;
        }
        setSecurityGate(gate);
        storeSecurityGate(gate);
      } catch {
        // Ignore gate fetch errors.
      } finally {
        if (isActive) {
          setIsGateLoading(false);
        }
      }
    };

    void loadSecurityGate();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!identityId || typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(flowStorageKey);
    if (!raw) {
      return;
    }
    try {
      const stored = JSON.parse(raw) as StoredFlowState;
      if (
        stored?.version === 3 &&
        stored.ownerId &&
        stored.ownerId !== identityId
      ) {
        window.localStorage.removeItem(flowStorageKey);
        setEvaluationProgress(0);
        setRemainingQuestions(null);
        setIsComplete(false);
        setHasActiveSession(false);
      }
    } catch {
      // Ignore malformed storage payloads.
    }
  }, [identityId]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClickOutside = (event: Event) => {
      const target = event.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const statusLabel = isComplete ? "Terminee" : "En cours";
  const progressLabel = useMemo(() => {
    if (isLoading && evaluationProgress === 0) {
      return "Mise a jour...";
    }
    return `${evaluationProgress}% complete`;
  }, [evaluationProgress, isLoading]);
  const remainingLabel = useMemo(() => {
    if (remainingQuestions === null) {
      return "Progression en cours";
    }
    if (remainingQuestions === 1) {
      return "1 question restante";
    }
    return `${remainingQuestions} questions restantes`;
  }, [remainingQuestions]);
  const localFirstEvaluationFallback = useMemo(
    () => !hasActiveSession && evaluationProgress === 0 && !isComplete,
    [evaluationProgress, hasActiveSession, isComplete],
  );
  const shouldStartComplete =
    isFirstEvaluation || localFirstEvaluationFallback;
  const ctaLabel = shouldStartComplete
    ? "Commencer l'evaluation"
    : "Continuer l'evaluation";
  const profileReady = useMemo(
    () => ({
      identity: displayName !== "Bonjour",
      personal: hasProfileData(personalProfile),
      medical: hasProfileData(medicalProfile),
    }),
    [displayName, medicalProfile, personalProfile],
  );
  const gateRequired = useMemo(
    () => isGateRequired(securityGate),
    [securityGate],
  );
  const gateLocked = useMemo(
    () => isGateLocked(securityGate),
    [securityGate],
  );
  const canAccessSensitive = !isGateLoading && !gateRequired && !gateLocked;

  const handleContinueEvaluation = async (
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    event.preventDefault();
    if (isStartingEvaluation) {
      return;
    }

    setIsStartingEvaluation(true);
    const stored = readStoredFlowState();
    const storedIds = resolveStoredSessionIds(stored);
    const storedEvaluationId = pickInternalSessionId(storedIds);
    if (storedEvaluationId && !stored?.isComplete) {
      router.push("/flow");
      setIsStartingEvaluation(false);
      return;
    }

    if (evaluationType === "thematic" && evaluationBlocKeys.length === 0) {
      router.push("/flow");
      setIsStartingEvaluation(false);
      return;
    }

    const startType = shouldStartComplete ? "complete" : evaluationType;
    try {
      if (shouldLog) {
        // eslint-disable-next-line no-console
        console.info("handleContinueEvaluation payload", {
          type: startType,
          bloc_keys: evaluationBlocKeys,
          context: startType === "thematic" ? evaluationContext : undefined,
        });
      }
      const referralCode = readStoredReferralCode();
      const response = await startEvaluation(
        {
          type: startType,
          bloc_keys: evaluationBlocKeys,
          ...(startType === "thematic" && evaluationContext
            ? { context: evaluationContext }
            : {}),
          ...(referralCode
            ? { ref: referralCode, referral_code: referralCode }
            : {}),
        },
        undefined,
        createIdempotencyKey(),
      );
      if (shouldLog) {
        // eslint-disable-next-line no-console
        console.info("handleContinueEvaluation response", response);
      }

      const sessionIds = extractSessionIds(response);
      const sessionId = pickInternalSessionId(sessionIds);
      if (sessionId && typeof window !== "undefined") {
        const question = extractEvaluationQuestion(response);
        const message =
          (response as { message?: string }).message ?? defaultCompletionPrompt;
        const normalizedQuestion = question
          ? normalizeStoredQuestion(question)
          : null;
        const initialMessages = normalizedQuestion
          ? [createMessage(getQuestionText(normalizedQuestion))]
          : [];
        const payload: StoredFlowState = {
          version: 4,
          answers: [],
          messages: initialMessages,
          questionHistory: normalizedQuestion ? [normalizedQuestion] : [],
          isComplete: !normalizedQuestion,
          sessionId,
          sessionInternalId: sessionIds.internalId ?? null,
          sessionPublicId: sessionIds.publicId ?? null,
          completionMessage: message,
          ownerId: identityId,
        };
        try {
          window.localStorage.setItem(flowStorageKey, JSON.stringify(payload));
          if (shouldLog) {
            // eslint-disable-next-line no-console
            console.info("profile stored flow payload", {
              sessionId,
              hasQuestion: Boolean(normalizedQuestion),
            });
          }
        } catch {
          // Ignore storage failures.
        }
      }
    } catch {
      // Let the flow page start a new evaluation.
    } finally {
      router.push("/flow");
      setIsStartingEvaluation(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutIdentity();
    } catch {
      // Ignore logout errors and continue.
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(flowStorageKey);
      }
      storeSecurityGate(null);
      router.push("/signin");
    }
  };

  return (
    <RequireAuth>
      <div className="page page--profile">
        <main className="page__content profile-dashboard">
          <header className="profile-dashboard__header">
            <div className="profile-dashboard__heading">
              <p className="profile-dashboard__eyebrow">Mini-dashboard</p>
              <h1 className="profile-dashboard__title">
                Bonjour{displayName ? ` ${displayName}` : ""}
              </h1>
              <p className="profile-dashboard__subtitle">
                Vue rapide de votre progression et des prochaines etapes
                prioritaires.
              </p>
              {evaluationType === "complete" && isComplete ? (
                <div className="profile-dashboard__subtitle" role="alert">
                  Premiere evaluation completee. Lancez une nouvelle evaluation
                  pour continuer.
                  <div>
                    <Link className="profile-pill" href="/flow">
                      Nouvelle evaluation
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="profile-dashboard__actions" aria-label="Actions rapides">
              <button
                type="button"
                className="profile-action profile-action--icon"
                aria-label="Notifications"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3a5 5 0 00-5 5v2c0 .9-.36 1.76-1 2.4L4 14v1h16v-1l-2-1.6a3.4 3.4 0 01-1-2.4V8a5 5 0 00-5-5z" />
                  <path d="M9 18a3 3 0 006 0" />
                </svg>
              </button>
              <button
                type="button"
                className="profile-action profile-action--icon"
                aria-label="Equipe"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="8" r="3" />
                  <circle cx="17" cy="9" r="2.5" />
                  <path d="M4 20c0-3 3-5 5-5s5 2 5 5" />
                  <path d="M14 20c.2-2.2 2-3.5 4-3.5 1.2 0 2.3.4 3 1" />
                </svg>
              </button>
              <Link
                className=""
                href="/profile/settings"
                role="menuitem"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="profile-action__menu" ref={menuRef}>
                  <button
                    type="button"
                    className="profile-action profile-action--avatar"
                    aria-label="Profil"
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    onClick={() => setIsMenuOpen((open) => !open)}
                  >

                    <span aria-hidden="true">
                      {profileInitial ? (
                        profileInitial
                      ) : (
                        <svg viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="8" />
                          <path d="M9 10h.01" />
                          <path d="M15 10h.01" />
                          <path d="M8.5 14c1.5 1.5 5.5 1.5 7 0" />
                        </svg>
                      )}
                    </span>


                  </button>

                </div>
              </Link>
            </div>
          </header>


          <section
            className="profile-card profile-card--progress"
            aria-labelledby="evaluation-title"
          >
            <div className="profile-status">
              <span
                className="profile-status__icon profile-status__icon--success"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M5 12l4 4L19 7" />
                </svg>
              </span>
              <div className="profile-status__text">
                <h2 className="profile-status__title" id="evaluation-title">
                  Evaluation :{" "}
                  <span className="profile-status__tag">{statusLabel}</span>
                </h2>
              </div>
            </div>
            <div className="profile-progress">
              <div
                className="progress-bar profile-progress__bar"
                role="progressbar"
                aria-valuenow={evaluationProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="progress-bar__fill profile-progress__fill"
                  style={{ width: `${evaluationProgress}%` }}
                />
              </div>
              <div className="profile-progress__meta">
                <div className="profile-progress__status">
                  <span
                    className="profile-status__icon profile-status__icon--warning profile-status__icon--small"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M12 4l9 16H3l9-16z" />
                      <path d="M12 9v5" />
                      <circle cx="12" cy="17" r="1" />
                    </svg>
                  </span>
                  <span>{progressLabel}</span>
                </div>
                <span className="profile-progress__note">{remainingLabel}</span>
              </div>
            </div>
            <Link
              className="btn profile-btn"
              href="/flow"
              onClick={handleContinueEvaluation}
              aria-disabled={isStartingEvaluation}
            >
              {ctaLabel}
            </Link>
          </section>

          {canAccessSensitive ? (
            <div className="profile-dashboard__grid">
            <section className="profile-card" aria-labelledby="profil-title">
              <div className="profile-tile">
                <div
                  className="profile-tile__icon profile-tile__icon--profile"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <rect x="4" y="5" width="16" height="14" rx="3" />
                    <circle cx="9" cy="11" r="2" />
                    <path d="M7 16h6" />
                  </svg>
                </div>
                <div className="profile-tile__content">
                  <h2 className="profile-tile__title" id="profil-title">
                    Profil
                  </h2>
                  <ul
                    className="profile-checklist"
                    aria-label="Etat du profil"
                  >
                    <li className="profile-checklist__item">
                      <span
                        className={`profile-checklist__dot ${
                          profileReady.identity
                            ? "profile-checklist__dot--ok"
                            : "profile-checklist__dot--warn"
                        }`}
                        aria-hidden="true"
                      />
                      Identite
                    </li>
                    <li className="profile-checklist__item">
                      <span
                        className={`profile-checklist__dot ${
                          profileReady.personal
                            ? "profile-checklist__dot--ok"
                            : "profile-checklist__dot--warn"
                        }`}
                        aria-hidden="true"
                      />
                      Profil personnel
                    </li>
                    <li className="profile-checklist__item">
                      <span
                        className={`profile-checklist__dot ${
                          profileReady.medical
                            ? "profile-checklist__dot--ok"
                            : "profile-checklist__dot--warn"
                        }`}
                        aria-hidden="true"
                      />
                      Profil medical
                    </li>
                  </ul>
                  <p className="profile-checklist__note">
                    {isProfileLoading
                      ? "Chargement des profils..."
                      : remainingLabel}
                  </p>
                  <div className="profile-tile__cta">
                    <Link className="profile-pill" href="/flow">
                      Completer
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="profile-card" aria-labelledby="personal-title">
              <div className="profile-tile">
                <div
                  className="profile-tile__icon profile-tile__icon--profile"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="3" />
                    <path d="M5 20c1.5-4 12.5-4 14 0" />
                  </svg>
                </div>
                <div className="profile-tile__content">
                  <h2 className="profile-tile__title" id="personal-title">
                    Profil personnel
                  </h2>
                  <ul className="profile-checklist" aria-label="Profil personnel">
                    <li className="profile-checklist__item">
                      Prenom : {formatValue(personalProfile?.first_name)}
                    </li>
                    <li className="profile-checklist__item">
                      Nom : {formatValue(personalProfile?.last_name)}
                    </li>
                    <li className="profile-checklist__item">
                      Date de naissance : {formatValue(personalProfile?.birth_date)}
                    </li>
                  </ul>
                                    <div className="profile-tile__cta">
                    <Link className="profile-pill profile-pill--rose" href="/flow">
                      Voir / Modifier
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="profile-card" aria-labelledby="medical-title">
              <div className="profile-tile">
                <div
                  className="profile-tile__icon profile-tile__icon--prevention"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div className="profile-tile__content">
                  <h2 className="profile-tile__title" id="medical-title">
                    Profil medical
                  </h2>
                  <ul className="profile-checklist" aria-label="Profil medical">
                    <li className="profile-checklist__item">
                      CMU : {formatValue(medicalProfile?.cmu_number)}
                    </li>
                    <li className="profile-checklist__item">
                      Groupe sanguin : {formatValue(medicalProfile?.blood_type)}
                    </li>
                    <li className="profile-checklist__item">
                      Menopause : {formatValue(medicalProfile?.menopause_status)}
                    </li>
                  </ul>
                                    <div className="profile-tile__cta">
                    <Link className="profile-pill profile-pill--rose" href="/flow">
                      Voir / Modifier
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="profile-card" aria-labelledby="symptomes-title">
              <div className="profile-tile">
                <div
                  className="profile-tile__icon profile-tile__icon--symptoms"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M3 12h4l2-4 3 8 2-4h7" />
                  </svg>
                </div>
                <div className="profile-tile__content">
                  <h2 className="profile-tile__title" id="symptomes-title">
                    Symptomes
                  </h2>
                  <ul
                    className="profile-checklist"
                    aria-label="Suivi des symptomes"
                  >
                    <li className="profile-checklist__item">
                      <span
                        className="profile-checklist__dot profile-checklist__dot--warn"
                        aria-hidden="true"
                      />
                      Sein : 1 symptome signale
                    </li>
                    <li className="profile-checklist__item">
                      <span
                        className="profile-checklist__dot profile-checklist__dot--ok"
                        aria-hidden="true"
                      />
                      Col de l'uterus : aucun symptome
                    </li>
                  </ul>
                  <div className="profile-tile__cta">
                    <Link className="profile-pill profile-pill--rose" href="/flow">
                      Voir / Modifier
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section
              className="profile-card"
              aria-labelledby="prevention-title"
            >
              <div className="profile-tile">
                <div
                  className="profile-tile__icon profile-tile__icon--prevention"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div className="profile-tile__content">
                  <h2 className="profile-tile__title" id="prevention-title">
                    Prevention
                  </h2>
                  <ul
                    className="profile-checklist"
                    aria-label="Points de prevention"
                  >
                    <li className="profile-checklist__item">
                      <span
                        className="profile-checklist__dot profile-checklist__dot--ok"
                        aria-hidden="true"
                      />
                      Depistage renseigne
                    </li>
                    <li className="profile-checklist__item">
                      <span
                        className="profile-checklist__dot profile-checklist__dot--warn"
                        aria-hidden="true"
                      />
                      Dernier depistage &gt; 3 ans
                    </li>
                  </ul>
                  <div className="profile-tile__cta">
                    <Link className="profile-pill profile-pill--amber" href="/action">
                      Que dois-je faire ?
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="profile-card" aria-labelledby="actions-title">
              <div className="profile-tile">
                <div
                  className="profile-tile__icon profile-tile__icon--actions"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M7 6h10" />
                    <path d="M7 12h10" />
                    <path d="M7 18h6" />
                    <path d="M5 6l1 1 2-2" />
                    <path d="M5 12l1 1 2-2" />
                  </svg>
                </div>
                <div className="profile-tile__content">
                  <h2 className="profile-tile__title" id="actions-title">
                    Actions
                  </h2>
                  <ul
                    className="profile-checklist"
                    aria-label="Actions conseillees"
                  >
                    <li className="profile-checklist__item">
                      <span
                        className="profile-checklist__dot profile-checklist__dot--ok"
                        aria-hidden="true"
                      />
                      Auto-surveillance conseillee
                    </li>
                    <li className="profile-checklist__item">
                      <span
                        className="profile-checklist__dot profile-checklist__dot--muted"
                        aria-hidden="true"
                      />
                      Rappel personnalise a venir
                    </li>
                  </ul>
                  <div className="profile-tile__cta">
                    <Link className="profile-pill profile-pill--mint" href="/action">
                      Voir mes actions
                    </Link>
                  </div>
                </div>
              </div>
            </section>
            </div>
          ) : (
            <section className="profile-card" aria-live="polite">
              <div className="profile-tile">
                <div
                  className="profile-tile__icon profile-tile__icon--symptoms"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 4l9 16H3l9-16z" />
                    <path d="M12 9v5" />
                    <circle cx="12" cy="17" r="1" />
                  </svg>
                </div>
                <div className="profile-tile__content">
                  <h2 className="profile-tile__title">Acces limite</h2>
                  <p className="profile-checklist__note">
                    Vous pouvez demarrer une evaluation, mais l'historique et
                    les informations sensibles sont verrouilles.
                  </p>
                  <div className="profile-tile__cta">
                    <Link className="profile-pill profile-pill--amber" href="/gate">
                      Deverrouiller
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}
