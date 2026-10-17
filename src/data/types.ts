// Types for the synthetic Northgate dataset. Field names follow Madison's backend models.

export type Iso = string; // "2026-10-16" or "2026-10-16T05:12:00Z"

export interface Institution {
  id: string;
  name: string;
  charter_type: string;
  regulator: string;
  fdic_cert_id: string;
  total_assets_usd: number;
  total_deposits_usd: number;
  states: string[];
  city: string;
  offices: number;
  established_on: Iso;
  product_flags: Record<string, boolean | null>;
  profile_retrieved_at: Iso;
  as_of: Iso;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  role: string;
  team: string;
  is_current_user?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  job: string;
  kind: "code" | "agent";
  hue: number; // 0 = neutral ink, 1..6 = --agent-n
}

export interface Regulation {
  id: string;
  citation: string;
  title: string;
  agency: string;
  jurisdiction: string;
  source: string;
  status: "amended" | "active";
  last_amended_at: Iso;
  retrieved_at: Iso;
  last_check: { status: "changed" | "unchanged" | "rate_limited"; checked_at: Iso };
  duties_on_record: number;
}

export type ChangeState =
  | "new"
  | "applies"
  | "uncertain"
  | "screened_out"
  | "duties"
  | "linked"
  | "whats_left"
  | "covered"
  | "closed";

export type JourneyStep = "applies" | "duties" | "linked" | "covered" | "whats_left" | "close";

export interface ChangeCounts {
  duties: number;
  covered: number;
  not_yet_confirmed: number;
  nothing_behind: number;
  known_gap: number;
}

export interface RuleChange {
  id: string;
  regulation_id: string;
  citation: string;
  title: string;
  kind: "amendment" | "guidance";
  agency: string;
  published_at: Iso;
  effective_date: Iso;
  state: ChangeState;
  step: JourneyStep;
  owner_id: string;
  summary: string;
  synthetic_note?: string;
  screen_reason?: string;
  counts: ChangeCounts | null;
  featured: boolean;
  run_id?: string;
  closed_at?: Iso;
  closed_by?: string;
  /** set during the demo when a run puts a new control in force */
  new_control?: string;
  after_run?: {
    state: ChangeState;
    step: JourneyStep;
    counts: ChangeCounts;
    excluded?: number;
    held_back?: number;
    new_control?: string;
  };
}

export interface RuleSection {
  id: string;
  change_id: string;
  section_number: string;
  heading: string;
  before: string;
  after: string;
  changed: boolean;
}

export type CoverageState =
  | "covered"
  | "not_yet_confirmed"
  | "nothing_behind"
  | "known_gap"
  | "out_of_scope"
  | "proposed";

export interface Duty {
  id: string;
  change_id: string;
  rule_section_id: string | null;
  citation: string;
  plain: string;
  source_text: string;
  actor: string;
  action: string;
  object: string;
  deadline_text: string;
  confidence: "high" | "medium" | "low";
  ambiguity_flag: boolean;
  status: "confirmed" | "proposed";
  coverage_state: CoverageState;
  owner_id: string;
  process_tags: string[];
  applicability: "in_scope" | "excluded";
  applicability_reason: string | null;
}

export interface PolicySection {
  id: string;
  document_code: string;
  document_title: string;
  section_number: string;
  heading: string;
  owner_id: string;
  doc_version: string;
  approved_at: Iso;
  review_due_at: Iso;
  text: string;
  drift?: boolean;
}

export interface ProcedureSection {
  id: string;
  document_code: string;
  document_title: string;
  section_number: string;
  heading: string;
  owner_id: string;
  doc_version: string;
  text: string;
}

export interface Control {
  id: string;
  name: string;
  owner_id: string;
  cadence: string | null;
  last_artifact_date: Iso | null;
  freshness_status: "fresh" | "quiet" | "unknown";
  quiet_days: number | null;
  control_type: string;
  nature: string;
  key_control: boolean;
  version: number;
  runs_on_vendors: string[];
}

export interface CoverageLink {
  id: string;
  obligation_id: string;
  link_type: "obligation_to_policy" | "obligation_to_control";
  policy_section_id: string | null;
  procedure_section_id: string | null;
  control_id: string | null;
  strength: "full" | "partial";
  quote: string;
  status: "confirmed" | "proposed";
  decided_by_user_id: string | null;
  decided_at: Iso | null;
  confidence: "high" | "medium" | "low";
}

export interface KnownGap {
  id: string;
  obligation_id: string;
  accepted_by_user_id: string;
  accepted_at: Iso;
  rationale: string;
  expiry: Iso;
  status: string;
}

export interface DriftFlag {
  id: string;
  obligation_id: string;
  policy_section_id: string;
  procedure_section_id: string;
  parameter_type: string;
  policy_quote: string;
  procedure_quote: string;
  policy_values: string[];
  procedure_values: string[];
  duty_limit: string;
  inside_policy: boolean;
  inside_procedure: boolean;
  summary: string;
  status: string;
  detected_at: Iso;
}

export interface Vendor {
  id: string;
  name: string;
  services: { name: string; process_tag: string }[];
  relationship_owner_id: string;
  criticality: "critical" | "high" | "medium" | "low";
}

export interface Impact {
  change_id: string;
  status: string;
  duties: string[];
  excluded: string[];
  policy_sections: string[];
  procedure_sections: string[];
  controls: string[];
  quiet_controls: string[];
  drift_flags: string[];
  vendors: { vendor_id: string; why: string }[];
}

export type TaskAction =
  | "run_rule"
  | "design_control"
  | "check_coverage"
  | "review_duties"
  | "review_obligations"
  | "answer_fact"
  | "upload_evidence"
  | "sign_off";

export interface Task {
  id: string;
  title: string;
  why: string;
  change_id?: string;
  obligation_id?: string;
  control_id?: string;
  assignee_id: string;
  due: Iso;
  state: "open" | "overdue" | "done" | "blocked" | "waiting_on_other";
  action?: TaskAction;
  kind?: "decide" | "review" | "answer" | "sign_off" | "upload_evidence" | "fix" | "vendor_review" | "follow_up" | "control_run" | "approve_report" | "test_plan";
  requested_by_id?: string;
  handoff_id?: string;
  priority: number;
}

export interface PositionCounts {
  covered: number;
  not_yet_confirmed: number;
  nothing_behind: number;
  known_gap: number;
}

export interface Position extends PositionCounts {
  as_of: Iso;
  total_applicable: number;
  out_of_scope: number;
  uncertain: number;
  history: (PositionCounts & { month: string; total: number })[];
  by_regulation: (PositionCounts & { regulation_id: string; citation: string; title: string })[];
}

export interface Reports {
  board_pack: {
    as_of: Iso;
    title: string;
    sections: { title: string; summary: string; kind: "counts" | "changes" | "gaps" | "asks" }[];
  };
  exam_readiness: {
    exam: string;
    starts: Iso;
    proven: number;
    in_scope: number;
    items: string[];
  };
}

export interface AuditEntry {
  at: Iso;
  who: string;
  kind: "agent" | "person";
  what: string;
}

export interface AskItem {
  q: string;
  context: string;
  trail: { agent_id: string; step: string; found?: string; ms: number }[];
  answer: string;
  certainty: Certainty;
  citations: string[];
  suggested_action?: { label: string; href: string };
}

export type Certainty = "Clear" | "Likely" | "Unsure";

// ---------- Runs ----------

export type StageState = "waiting" | "running" | "done" | "waiting_person" | "refused" | "failed";

export interface RunStage {
  key: string;
  title: string;
  agents: string[]; // agent ids, or "person:u-elena"
  kind: "code" | "agent" | "gate" | "person";
}

export interface RunSource {
  id: string;
  label: string;
  detail: string;
}

interface EventBase {
  t: number;
}

export interface StageEvent extends EventBase {
  type: "stage";
  stage: string;
  state: StageState;
  detail?: string;
}

export interface ItemEvent extends EventBase {
  type: "item";
  id: string;
  kind: string;
  label: string;
  from: string;
  to: string;
  agent_id?: string;
  parent_ref?: string;
  changed?: boolean;
  state?: string;
  coverage_state?: CoverageState;
  score?: Certainty;
}

export interface CheckEvent extends EventBase {
  type: "check";
  gate: string;
  item_ref: string;
  result: "pass" | "block" | "cannot_tell";
  reason: string;
  certainty?: Certainty;
  kind?: string;
  label?: string;
  how?: string;
}

export interface PersonEvent extends EventBase {
  type: "person";
  stage: string;
  waiting_for: string;
  prompt: string;
  actions: { id: string; label: string }[];
  items?: string[];
}

export interface OutputEvent extends EventBase {
  type: "output";
  card: { label: string; value: string; certainty?: Certainty; reason?: string };
}

export interface MetricEvent extends EventBase {
  type: "metric";
  key: "sections" | "duties_found" | "held_back" | "links" | "cost_usd";
  value: number;
}

export interface ChartEvent extends EventBase {
  type: "chart";
  series: string;
  value: number;
}

export interface NarrateEvent extends EventBase {
  type: "narrate";
  text: string;
}

export type RunEvent =
  | StageEvent
  | ItemEvent
  | CheckEvent
  | PersonEvent
  | OutputEvent
  | MetricEvent
  | ChartEvent
  | NarrateEvent;

export interface Run {
  id: string;
  title: string;
  change_id: string;
  obligation_id?: string;
  trigger: { by: string; label: string };
  stages: RunStage[];
  sources: RunSource[];
  duration_ms: number;
  events: RunEvent[];
}

// ---------- Iteration 2 ----------

export type NeededField = {
  id: string;
  label: string;
  kind: "text" | "date" | "file" | "choice" | "table";
  required: boolean;
  choices?: string[];
};

export interface Handoff {
  id: string;
  type: string;
  from_user_id: string;
  to_user_id: string;
  created_at: Iso;
  due: Iso;
  status: "open" | "overdue" | "waiting_on_previous" | "done";
  title: string;
  ask: string;
  why: string;
  change_id?: string;
  obligation_id?: string;
  control_id?: string;
  waits_for?: string;
  provided: { kind: string; label: string; text: string }[];
  needed: NeededField[];
  options: { id: string; label: string }[];
  blocks: string[];
  thread: { at: Iso; by: string; text: string }[];
}

export interface Consequence {
  obligation_id: string;
  state: CoverageState;
  headline: string;
  what_happens: string;
  who_is_affected: string;
  exam_risk: "High" | "Medium" | "Low";
  exam_note: string;
  illustrative_exposure: { label: string; text: string };
  accepted: { by: string; at: Iso; until: Iso; why: string } | null;
  next: string;
}

export interface RecordEntryV2 {
  id: string;
  prev: string | null;
  at: Iso;
  actor: string;
  kind: "person" | "agent";
  type: string;
  text: string;
  run_id?: string | null;
  refs: string[];
  signed: boolean;
}

export interface ReportsV2 {
  board_pack: {
    id: string;
    title: string;
    as_of: Iso;
    status: "draft" | "approved";
    prepared_by: string;
    approver_id: string;
    how_built: { step: string; detail: string; source: string }[];
    conclusions: string[];
    sections: { n: number; title: string; summary: string; blocks: string[] }[];
    comments: { by: string; at: Iso; section: number; text: string }[];
    additions: unknown[];
  };
  exam_pack: {
    id: string;
    title: string;
    starts: Iso;
    proven: number;
    in_scope: number;
    areas: { name: string; proven: boolean; why?: string; items?: string[] }[];
  };
}

// ---------- Iteration 3 ----------
export interface BusinessLine {
  id: string;
  name: string;
  head_id: string;
}
export interface ProcessArea {
  process_tag: string;
  name: string;
  business_line: string;
  owner_id: string;
  policy: string | null;
  regulations: string[];
}
export interface Ownership {
  note: string;
  business_lines: BusinessLine[];
  process_areas: ProcessArea[];
  roles_on_every_obligation: Record<string, string>;
  add_users: User[];
}
export interface ChangeDates {
  change_id: string;
  published: Iso;
  effective: Iso;
  northgate_deadline: Iso | null;
  closed?: Iso;
}
export interface Scenario {
  change_id: string;
  citation: string;
  stage: string;
  steps_done: number;
  of: number;
  owner_area: string;
  demo: string;
}
export interface DemoStep {
  n: number;
  where: string;
  do: string;
  see: string;
}
export interface DemoFlow {
  id: string;
  title: string;
  audience: string;
  persona: string;
  minutes: number;
  start: string;
  scenario_reset: string[];
  story: string;
  steps: DemoStep[];
  end: string;
  talk_track: string[];
}
