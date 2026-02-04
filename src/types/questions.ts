export type QuestionOption = {
  value: string;
  label: string;
};

export type QuestionNextMap = Record<string, string | null>;

export type VisibleIfRule = {
  source: "question";
  key: string;
  value: string | number | boolean;
  operator?: "=" | "!=";
};

export type QuestionType =
  | "boolean"
  | "text"
  | "number"
  | "select_one"
  | "select_multiple"
  | "slider"
  | "date"
  | "info"
  | "file"
  | "image"
  | "audio"
  | "video"
  | "location"
  | "rating"
  | "time"
  | "valide"
  | "custom";

export type Question = {
  id?: string;
  key: string;
  text: string;
  prompt?: string;
  type: QuestionType;
  options?: QuestionOption[] | string;
  placeholder?: string;
  actionLabel?: string;
  min?: number;
  max?: number;
  step?: number;
  next?: string | QuestionNextMap | null;
  bloc_key?: string;
  answer_target?: string;
  is_entry_point?: boolean;
  order?: number;
  visible_if?: VisibleIfRule[];
  risk_weight?: number;
  media_type?: string;
  media_url?: string;
};
