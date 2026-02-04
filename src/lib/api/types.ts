import type { Question } from "@/types/questions";

export type FlowEntryPoint = {
  id: string | number;
  label: string;
  description?: string;
  blocKey?: string;
};

export type AnswerInput = {
  sessionId?: string;
  questionId: string;
  value: string | string[];
  display?: string;
};

export type Answer = AnswerInput & {
  id: string;
  createdAt?: string;
};

export type FlowQuestionRequest = {
  entryPointId?: string;
  entry_point_id?: string;
  sessionId?: string;
  session_id?: string;
  evaluation_session_id?: number;
  currentQuestionId?: string | null;
  current_question_id?: string | null;
  answers?: AnswerInput[];
};

export type FlowQuestionResponse = {
  question: Question | null;
  isComplete?: boolean;
  groupId?: string | null;
};

export type FlowNextGroupRequest = {
  sessionId: string;
  currentGroupId?: string | null;
};

export type FlowNextGroupResponse = {
  groupId: string | null;
  question?: Question | null;
  isComplete?: boolean;
};

export type EvaluationSessionStatus =
  | "draft"
  | "in_progress"
  | "completed"
  | "expired";

export type EvaluationSession = {
  id: string | number;
  public_id?: string;
  publicId?: string;
  status: EvaluationSessionStatus;
  type?: string;
  score?: number | null;
  risk_level?: string | null;
  started_at?: string;
  completed_at?: string | null;
  decision_path_id?: string | number | null;
  decision_path_key?: string | null;
  decision_path_version?: string | null;
  catalog_version?: string | number | null;
  risk_model_version?: string | number | null;
  current_question_id?: string | number | null;
  current_node_key?: string | null;
  target_blocs?: string[];
  visited_blocs?: string[];
  entryPointId?: string;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  currentQuestionId?: string | number | null;
  current_question?: EvaluationQuestion | null;
  currentQuestion?: EvaluationQuestion | null;
};

export type StartEvaluationRequest = {
  type: string;
  bloc_keys?: string[];
  context?: Record<string, unknown>;
  entryPointId?: string;
  sessionId?: string;
  answer_target?: string;
  ref?: string;
  referral_code?: string;
};

export type StartEvaluationResponse = {
  session: EvaluationSession;
  question?: EvaluationQuestion | null;
  currentQuestion?: EvaluationQuestion | null;
  insight?: EvaluationInsight | null;
  report?: EvaluationReport | null;
  message?: string;
  score?: number;
};

export type EvaluationQuestionOption = string | { value: string; label: string };

export type EvaluationQuestion = {
  id: string | number;
  key?: string | number;
  label?: string;
  text?: string;
  type?: string;
  bloc_key?: string | null;
  answer_target?: string | null;
  order?: number | null;
  risk_weight?: number | null;
  media_type?: string | null;
  media_url?: string | null;
  visible_if?: unknown;
  question_id?: string | number | null;
  node_id?: string | number | null;
  node_type?: string | null;
  outcome_message?: string | null;
  specialties?: string[];
  options?: EvaluationQuestionOption[] | string;
  placeholder?: string;
  actionLabel?: string;
  min?: number;
  max?: number;
  step?: number;
};

export type EvaluationInsight = {
  id?: string | number;
  model_version?: string;
  calibration_tag?: string | null;
  risk_score?: number | null;
  risk_level?: string | null;
  score_total?: number | null;
  confidence_score?: number | null;
  confidence_interval_low?: number | null;
  confidence_interval_high?: number | null;
  data_quality?: {
    missing_answers?: number;
    critical_missing?: boolean;
    inconsistent?: boolean;
    data_quality_score?: number;
    notes?: unknown[];
  };
  explanations?: unknown[];
  suggested_action?: string | null;
  requires_human_validation?: boolean;
  human_validation_reason?: string | null;
  final_decision?: unknown;
};

export type EvaluationReport = {
  id: string | number;
  score?: number | null;
  max_score?: number | null;
  risk_level?: string | null;
  recommendation?: string | null;
};

export type EvaluationAdvanceRequest = {
  question_id: string | number;
  value?: string | string[];
  file_ids?: string[];
  is_skipped?: boolean;
};

export type EvaluationNextRequest = EvaluationAdvanceRequest;

export type EvaluationAdvanceResponse = {
  session: EvaluationSession;
  question?: EvaluationQuestion | null;
  currentQuestion?: EvaluationQuestion | null;
  isComplete?: boolean;
  message?: string;
  score?: number;
  insight?: EvaluationInsight | null;
  report?: EvaluationReport | null;
};

export type EvaluationNextResponse = EvaluationAdvanceResponse;

export type EvaluationStateResponse = {
  session: EvaluationSession;
  question?: EvaluationQuestion | null;
  currentQuestion?: EvaluationQuestion | null;
  isComplete?: boolean;
  message?: string;
  insight?: EvaluationInsight | null;
  report?: EvaluationReport | null;
};

export type EvaluationCompleteResponse = {
  session: EvaluationSession;
  insight?: EvaluationInsight | null;
  question?: EvaluationQuestion | null;
  report?: EvaluationReport | null;
  message?: string;
  reportId?: string;
};

export type ThematicBloc = {
  id: string;
  key: string;
  title: string;
  description?: string;
  order?: number;
};

export type ThematicBlocDetail = ThematicBloc & {
  questions?: Question[];
};

export type Report = {
  id: string;
  sessionId: string;
  createdAt?: string;
  summary?: string;
};

export type Identity = {
  id: string;
  kind: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type SecurityGate = {
  state?: string;
  gate_required?: boolean;
  device_trusted?: boolean;
  locked_until?: string | number | null;
  panic_locked_at?: string | null;
  pin_enabled?: boolean;
  secret_set?: boolean;
  secret_set_at?: string | null;
};

export type IdentityPersonalProfile = Record<string, unknown>;

export type IdentityMedicalProfile = Record<string, unknown>;

export type Organization = {
  id: string;
  type?: string;
  name?: string;
  slug?: string;
  status?: string;
};

export type OrganizationResponse =
  | Organization
  | { organization: Organization }
  | { data: Organization }
  | { default: Organization };

export type UploadRecord = {
  file_id: string;
  original_name: string;
  mime_type: string;
  size: number;
};

export type UploadResponse = {
  file_id: string;
  upload: UploadRecord;
};

export type IdentityCredential = {
  id: number | string;
  identity_id: string;
  type: string;
  identifier: string;
  verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type IdentityMembership = {
  id: number | string;
  identity_id: string;
  organization_id: string;
  role: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type RegisterIdentityRequest = {
  kind: string;
  credential_type: string;
  identifier: string;
  secret?: string;
  device_fingerprint?: string;
  role: string;
  organization_id: string;
};

export type LoginIdentityRequest = {
  credential_type: string;
  identifier: string;
  secret?: string;
  device_fingerprint?: string;
};

export type RegisterIdentityResponse = {
  token: string;
  identity: Identity;
  credential: IdentityCredential;
  membership: IdentityMembership;
  security_gate?: SecurityGate;
};

export type LoginIdentityResponse = {
  token: string;
  identity: Identity;
  security_gate?: SecurityGate;
};

export type SetIdentitySecretRequest = {
  secret: string;
};

export type UnlockIdentityRequest = {
  method: "pin" | "agent" | "biometric";
  secret?: string;
  device_fingerprint?: string;
};

export type SecurityGateResponse = {
  security_gate: SecurityGate;
};
