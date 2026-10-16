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

export const institution = institutionJson as Institution;
export const users = usersJson as User[];
export const agents = agentsJson as Agent[];
export const regulations = regulationsJson as Regulation[];
export const ruleChanges = ruleChangesJson as RuleChange[];
export const ruleSections = ruleSectionsJson as RuleSection[];
export const duties = dutiesJson as Duty[];
export const policySections = policyJson as PolicySection[];
export const procedureSections = procedureJson as ProcedureSection[];
export const controls = controlsJson as Control[];
export const coverageLinks = linksJson as CoverageLink[];
export const knownGaps = gapsJson as KnownGap[];
export const driftFlags = driftJson as DriftFlag[];
export const vendors = vendorsJson as Vendor[];
export const impacts = impactsJson as Impact[];
export const tasks = tasksJson as Task[];
export const reports = reportsJson as Reports;
export const auditTrail = auditJson as AuditEntry[];
export const askMadison = askJson as AskItem[];
export const runs = [runRule1005, runCoverage1026, runDesignMfa] as unknown as Run[];

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

export const position = () => positionJson as Position;
export const run = (id: string) => runMap.get(id);
export const runForChange = (changeId: string) => runs.find((r) => r.change_id === changeId);

/** Who the "Viewing as" switch offers. */
export const PERSONA_IDS = ["u-elena", "u-anthony", "u-priya"] as const;
export type PersonaId = (typeof PERSONA_IDS)[number];

export const personaRole: Record<PersonaId, string> = {
  "u-elena": "Analyst",
  "u-anthony": "CCO",
  "u-priya": "CISO",
};

/** Resolve any id used in citations to a label and a link. */
export function resolveRef(ref: string): { label: string; detail?: string; href: string } | undefined {
  const duty = getDuty(ref);
  if (duty) return { label: duty.plain, detail: duty.id, href: `/duties/${duty.id}/` };
  const pol = policyById(ref);
  if (pol) return { label: `${pol.document_code} ${pol.section_number} ${pol.heading}`, detail: pol.document_title, href: `/coverage/?view=documents&doc=${pol.id}` };
  const prc = procedureById(ref);
  if (prc) return { label: `${prc.document_code} ${prc.section_number.toLowerCase()} ${prc.heading}`, detail: prc.document_title, href: `/coverage/?view=documents&doc=${prc.id}` };
  const ctl = controlById(ref);
  if (ctl) return { label: `${ctl.id} ${ctl.name}`, href: `/duties/?control=${ctl.id}` };
  const ven = vendorById(ref);
  if (ven) return { label: ven.name, detail: ven.services.map((s) => s.name).join(", "), href: `/rules/RC-2026-014/?touches=1` };
  const chg = getChange(ref);
  if (chg) return { label: `${chg.citation} ${chg.title}`, detail: chg.id, href: `/rules/${chg.id}/` };
  const dr = driftById(ref);
  if (dr) return { label: `Drift ${dr.id}`, detail: dr.summary, href: `/rules/${getDuty(dr.obligation_id)?.change_id ?? ""}/?step=whats_left` };
  return undefined;
}

import agentMetaJson from "./agent_meta.json";
export const agentMeta = (id: string) => (agentMetaJson as unknown as Record<string, { runs_on: string; version: string }>)[id];
