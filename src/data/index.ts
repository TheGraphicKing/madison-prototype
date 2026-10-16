// Typed getters over the synthetic dataset. Screens read data only through here.
import institutionJson from "./institution.json";
import usersJson from "./users.json";
import agentsJson from "./agents.json";
import regulationsJson from "./regulations.json";
import ruleChangesJson from "./rule_changes.json";
import ruleSectionsJson from "./rule_sections.json";
import dutiesJson from "./duties.json";
import policyJson from "./policy_sections.json";
import procedureJson from "./procedure_sections.json";
import controlsJson from "./controls.json";
import linksJson from "./coverage_links.json";
import gapsJson from "./known_gaps.json";
import driftJson from "./drift_flags.json";
import vendorsJson from "./vendors.json";
import impactsJson from "./impacts.json";
import tasksJson from "./tasks.json";
import positionJson from "./position.json";
import reportsJson from "./reports.json";
import auditJson from "./audit_trail.json";
import askJson from "./ask_madison.json";
import runRule1005 from "./runs/run-rule-1005.json";
import runCoverage1026 from "./runs/run-coverage-1026.json";
import runDesignMfa from "./runs/run-design-mfa.json";

import type {
  Agent,
  AskItem,
  AuditEntry,
  Control,
  CoverageLink,
  DriftFlag,
  Duty,
  Impact,
  Institution,
  KnownGap,
  PolicySection,
  Position,
  ProcedureSection,
  Regulation,
  Reports,
  RuleChange,
  RuleSection,
  Run,
  Task,
  User,
  Vendor,
} from "./types";
import { obligationWords } from "@/lib/words";

/** Visible words only: every string value is mapped to bank wording; ids and keys are unchanged. */
const KEY_FIELDS = new Set(["id", "key", "stage", "to", "from", "gate", "item_ref", "parent_ref", "kind", "type", "state", "status", "series", "result", "step", "context", "agents", "action", "process_tags", "coverage_state", "applicability", "link_type", "strength", "confidence"]);
function words<T>(v: T, field = ""): T {
  if (KEY_FIELDS.has(field) || field.endsWith("_id") || field.endsWith("_ids")) return v;
  if (typeof v === "string") return obligationWords(v) as T;
  if (Array.isArray(v)) return v.map((x) => words(x, field === "items" ? "items" : "")) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, words(x, k)])) as T;
  return v;
}

export const institution = words(institutionJson) as Institution;
export const users = words(usersJson) as User[];
export const agents = words(agentsJson) as Agent[];
export const regulations = words(regulationsJson) as Regulation[];
export const ruleChanges = words(ruleChangesJson) as RuleChange[];
export const ruleSections = words(ruleSectionsJson) as RuleSection[];
export const duties = words(dutiesJson) as Duty[];
export const policySections = words(policyJson) as PolicySection[];
export const procedureSections = words(procedureJson) as ProcedureSection[];
export const controls = words(controlsJson) as Control[];
export const coverageLinks = words(linksJson) as CoverageLink[];
export const knownGaps = words(gapsJson) as KnownGap[];
export const driftFlags = words(driftJson) as DriftFlag[];
export const vendors = words(vendorsJson) as Vendor[];
export const impacts = words(impactsJson) as Impact[];
export const tasks = words(tasksJson) as Task[];
export const reports = words(reportsJson) as Reports;
export const auditTrail = words(auditJson) as AuditEntry[];
export const askMadison = (words(askJson) as AskItem[]).map((a) => ({ ...a, trail: a.trail.map((t) => ({ ...t, step: obligationWords(t.step) })) }));
export const runs = words([runRule1005, runCoverage1026, runDesignMfa]) as unknown as Run[];

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const changeMap = byId(ruleChanges);
const dutyMap = byId(duties);
const controlMap = byId(controls);
const policyMap = byId(policySections);
const procedureMap = byId(procedureSections);
const userMap = byId(users);
const agentMap = byId(agents);
const vendorMap = byId(vendors);
const runMap = byId(runs);
const regulationMap = byId(regulations);
const driftMap = byId(driftFlags);

export const getChange = (id: string) => changeMap.get(id);
export const getDuty = (id: string) => dutyMap.get(id);
export const dutiesFor = (changeId: string) => duties.filter((d) => d.change_id === changeId);
export const linksFor = (dutyId: string) => coverageLinks.filter((l) => l.obligation_id === dutyId);
export const controlById = (id: string) => controlMap.get(id);
export const policyById = (id: string) => policyMap.get(id);
export const procedureById = (id: string) => procedureMap.get(id);
export const vendorById = (id: string) => vendorMap.get(id);
export const regulationById = (id: string) => regulationMap.get(id);
export const driftById = (id: string) => driftMap.get(id);
export const userById = (id: string) => userMap.get(id);
export const agentById = (id: string) => agentMap.get(id);
export const impactFor = (changeId: string) => impacts.find((i) => i.change_id === changeId);
export const sectionsFor = (changeId: string) => ruleSections.filter((s) => s.change_id === changeId);
export const driftFor = (dutyId: string) => driftFlags.filter((d) => d.obligation_id === dutyId);
export const gapFor = (dutyId: string) => knownGaps.find((g) => g.obligation_id === dutyId);

export function vendorsFor(changeId: string) {
  const impact = impactFor(changeId);
  if (!impact) return [];
  return impact.vendors
    .map((v) => ({ vendor: vendorById(v.vendor_id), why: v.why }))
    .filter((v): v is { vendor: Vendor; why: string } => Boolean(v.vendor));
}

/** Tasks for a person. Also lists tasks on duties they own, so owners see their gaps. */
export function tasksFor(userId: string) {
  return tasks
    .filter((t) => {
      if (t.assignee_id === userId) return true;
      if (t.obligation_id && getDuty(t.obligation_id)?.owner_id === userId) return true;
      return false;
    })
    .sort((a, b) => a.priority - b.priority || a.due.localeCompare(b.due));
}

const positionData = words(positionJson) as Position;
export const position = () => positionData;
export const run = (id: string) => runMap.get(id);
export const runForChange = (changeId: string) => runs.find((r) => r.change_id === changeId);

/** Who the "Viewing as" switch offers. */
export const PERSONA_IDS = ["u-elena", "u-anthony", "u-priya", "u-grace", "u-margaret", "u-nadia", "u-ravi"] as const;
export type PersonaId = (typeof PERSONA_IDS)[number];

export const personaRole: Record<PersonaId, string> = {
  "u-elena": "Analyst",
  "u-anthony": "CCO",
  "u-priya": "CISO",
  "u-grace": "Mortgage operations",
  "u-margaret": "Payment operations",
  "u-nadia": "Third party risk",
  "u-ravi": "Assurance",
};

/** Resolve any id used in citations to a label and a link. */
export function resolveRef(ref: string): { label: string; detail?: string; href: string } | undefined {
  const duty = getDuty(ref);
  if (duty) return { label: duty.plain, detail: duty.id, href: `/obligations/${duty.id}/` };
  const pol = policyById(ref);
  if (pol) return { label: `${pol.document_code} ${pol.section_number} ${pol.heading}`, detail: pol.document_title, href: `/coverage/?view=documents&doc=${pol.id}` };
  const prc = procedureById(ref);
  if (prc) return { label: `${prc.document_code} ${prc.section_number.toLowerCase()} ${prc.heading}`, detail: prc.document_title, href: `/coverage/?view=documents&doc=${prc.id}` };
  const ctl = controlById(ref);
  if (ctl) return { label: `${ctl.id} ${ctl.name}`, href: `/obligations/?control=${ctl.id}` };
  const ven = vendorById(ref);
  if (ven) return { label: ven.name, detail: ven.services.map((s) => s.name).join(", "), href: `/rules/RC-2026-014/?touches=1` };
  const chg = getChange(ref);
  if (chg) return { label: `${chg.citation} ${chg.title}`, detail: chg.id, href: `/rules/${chg.id}/` };
  const dr = driftById(ref);
  if (dr) return { label: `Drift ${dr.id}`, detail: dr.summary, href: `/rules/${getDuty(dr.obligation_id)?.change_id ?? ""}/?step=whats_left` };
  return undefined;
}

import examHistoryJson from "./exam_history.json";
export const examHistory = examHistoryJson as {
  proven_by_month: { month: string; proven: number }[];
  not_proven: string[];
  area_links: Record<string, string>;
};

// ---------- Iteration 2 ----------
import handoffsJson from "./handoffs.json";
import consequencesJson from "./consequences.json";
import reportsV2Json from "./reports_v2.json";
import recordV2Json from "./record_v2.json";
import type { Consequence, Handoff, RecordEntryV2, ReportsV2 } from "./types";

export const handoffs = words(handoffsJson) as Handoff[];
export const consequences = words(consequencesJson) as Consequence[];
export const reportsV2 = words(reportsV2Json) as ReportsV2;
export const recordV2 = (words(recordV2Json) as RecordEntryV2[]).slice().sort((a, b) => a.at.localeCompare(b.at));
export const handoffById = (id: string) => handoffs.find((h) => h.id === id);
export const consequenceFor = (obligationId: string) => consequences.find((c) => c.obligation_id === obligationId);
export const taskById = (id: string) => tasks.find((t) => t.id === id);
