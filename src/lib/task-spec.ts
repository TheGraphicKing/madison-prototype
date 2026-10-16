// What the task drawer shows for each task: the ask, why, what was given, what is needed,
// the options and what each one does next. Handoff tasks come straight from handoffs.json;
// the others are described here from their own data.
import type { Handoff, NeededField, Task } from "@/data/types";
import { controlById, driftFlags, dutiesFor, getChange, knownGaps, reportsV2, sectionsFor, userById } from "@/data";
import { fmtDate } from "./dates";

export interface TaskSpec {
  ask: string;
  why: string;
  blocks: string[];
  provided: Handoff["provided"];
  needed: NeededField[];
  options: { id: string; label: string; next: string; primary?: boolean; href?: string }[];
  /** decide and sign-off tasks use the Decision panel */
  decision: boolean;
  handoff?: Handoff;
}

export function taskSpec(t: Task, h?: Handoff): TaskSpec {
  const isDecision = t.kind === "decide" || t.kind === "sign_off" || t.kind === "approve_report";
  if (h) {
    return {
      ask: h.ask,
      why: h.why,
      blocks: h.blocks,
      provided: h.provided,
      needed: h.needed,
      options: h.options.map((o, i) => ({ id: o.id, label: o.label, next: nextFor(h, o.id), primary: i === 0 })),
      decision: isDecision,
      handoff: h,
    };
  }
  const c = t.change_id ? getChange(t.change_id) : undefined;
  const base = { ask: t.title, why: t.why, blocks: [] as string[], provided: [] as Handoff["provided"], needed: [] as NeededField[], decision: isDecision };
  if (c) base.provided.push({ kind: "record", label: `${c.citation} · ${c.title}`, text: c.summary });

  switch (t.id) {
    case "T-301":
      for (const s of sectionsFor("RC-2026-014").filter((x) => x.changed)) base.provided.push({ kind: "quote", label: `Rule ${s.section_number}`, text: s.after });
      return {
        ...base,
        why: "The amendment halves the time to give provisional credit. Nothing downstream can start until Madison has read it.",
        ask: "Run Madison on the amended rule, then accept the obligations it finds.",
        blocks: ["Anthony Marsh cannot accept the impact of 12 CFR 1005.11(c)", "3 vendor checks cannot start"],
        options: [{ id: "run", label: "Run Madison on this rule", next: "Madison reads the rule and stops for you at the decision.", primary: true, href: "/runs/run-rule-1005/?mode=live&from=/rules/RC-2026-014/" }],
      };
    case "T-298":
      base.provided.push(
        { kind: "draft", label: "Suggested fix", text: "A new control (CTL-153) and one sentence added to POL-ISP-01 3.1." },
        { kind: "draft", label: "Draft CTL-153", text: "Phishing-resistant MFA for privileged access, including vendors, checked monthly." },
        { kind: "check", label: "Design checks", text: "6 of 7 pass; D6 (cannot be bypassed) waits on Priya Raman." },
      );
      return {
        ...base,
        ask: "Confirm the fix Madison drafted for the MFA gap.",
        blocks: ["CTL-153 cannot go to the CCO until the fix is confirmed and D6 is answered"],
        options: [
          { id: "confirm", label: "Go with CTL-153", next: "Priya Raman answers D6, then Anthony Marsh signs off.", primary: true },
          { id: "review", label: "See how Madison drafted it", next: "Opens the recorded run at the design checks.", href: "/runs/run-design-mfa/?mode=replay&from=/tasks/" },
        ],
      };
    case "T-296":
      return {
        ...base,
        ask: "Run the coverage check for revised Loan Estimates, then confirm the links.",
        blocks: ["RC-2026-016 cannot move to Covered"],
        options: [{ id: "run", label: "Run the coverage check", next: "Madison compares policy, procedure and rule, then asks you to confirm.", primary: true, href: "/runs/run-coverage-1026/?mode=live&from=/rules/RC-2026-016/" }],
      };
    case "T-289": {
      const ds = dutiesFor("RC-2026-013");
      for (const d of ds) base.provided.push({ kind: "quote", label: `${d.citation} · ${d.plain}`, text: d.source_text });
      return {
        ...base,
        decision: true,
        ask: `Accept ${ds.length} Truth in Savings obligations, each checked against the rule's own words.`,
        blocks: ["RC-2026-013 cannot be linked to policies"],
        options: [
          { id: "accept", label: `Accept ${ds.length} obligations`, next: "Madison matches them to policies and controls.", primary: true },
          { id: "open", label: "Review in the change room", next: "Opens the obligations one by one.", href: "/rules/RC-2026-013/" },
        ],
      };
    }
    case "T-285":
      return {
        ...base,
        decision: true,
        ask: "Confirm the impact review for 31 CFR 1020.220 can go ahead.",
        why: "It applies to Northgate (accounts opened through digital channels). Madison proposes the obligations once you confirm.",
        options: [{ id: "confirm", label: "Confirm the review", next: "Tom Reed, as owner, gets the proposed obligations to review.", primary: true }],
      };
    case "T-281":
      return {
        ...base,
        options: [
          { id: "nudge", label: "Nudge Corvane Payments", next: "Nadia Brennan's team sends a reminder.", primary: true },
          { id: "answered", label: "Mark as answered", next: "Closes this follow-up.", },
        ],
      };
    case "T-293": {
      const ctl = controlById("CTL-150")!;
      base.provided.push({ kind: "record", label: `${ctl.id} ${ctl.name}`, text: `Quarterly · last evidence ${fmtDate(ctl.last_artifact_date)}` });
      return {
        ...base,
        needed: [
          { id: "file", label: "Signed access review", kind: "file", required: true },
          { id: "note", label: "Exceptions found", kind: "text", required: false },
        ],
        options: [{ id: "record", label: "Record the review", next: "CTL-150 stays fresh for the quarter.", primary: true }],
      };
    }
    case "T-287": {
      const g = knownGaps[0];
      base.provided.push({ kind: "record", label: `Known gap ${g.id}`, text: g.rationale });
      return {
        ...base,
        decision: true,
        ask: "Renew or close the known gap on wire releases before it expires.",
        why: `Accepted by ${userById(g.accepted_by_user_id)?.name} on ${fmtDate(g.accepted_at)}; expires ${fmtDate(g.expiry)}.`,
        options: [
          { id: "renew", label: "Renew the known gap", next: "The gap stays accepted for one more quarter, with the same owner.", primary: true },
          { id: "close", label: "Close the known gap", next: "The obligation counts as Not yet confirmed until CTL-118 covers the fallback screen." },
        ],
      };
    }
    case "T-284": {
      return {
        ...base,
        decision: true,
        ask: "Accept the impact of 12 CFR 1005.11(c).",
        why: "6 obligations, 4 policy sections, 2 procedures, 5 controls and 3 vendors are touched. One obligation has nothing behind it.",
        options: [{ id: "accept", label: "Accept the impact", next: "The fixes go to their owners; the change can move to What's left.", primary: true }],
      };
    }
    case "T-280": {
      const bp = reportsV2.board_pack;
      for (const k of bp.conclusions) base.provided.push({ kind: "quote", label: "Conclusion", text: k });
      return {
        ...base,
        decision: true,
        ask: `Approve "${bp.title}" for the board.`,
        why: `Prepared by ${userById(bp.prepared_by)?.name}. ${bp.comments.length} comments are open.`,
        options: [
          { id: "approve", label: "Approve the board pack", next: "The pack is marked Approved and written to the record.", primary: true },
          { id: "open", label: "Read the board pack", next: "Opens the full document with its comments.", href: "/reports/board-pack/" },
        ],
      };
    }
    case "T-290":
    case "T-283": {
      const dr = driftFlags.find((d) => d.id === "DR-031")!;
      base.provided.push({ kind: "quote", label: "Rule 12 CFR 1005.11(c)(2)", text: "within 5 business days of receiving the error notice" }, { kind: "quote", label: "Policy POL-DISP-01 4.2", text: dr.policy_quote }, { kind: "quote", label: "Procedure PRC-DISP-06 step 4", text: dr.procedure_quote });
      return {
        ...base,
        blocks: ["D-1005-E2 stays Nothing behind it"],
        needed: [
          { id: "new_text", label: t.id === "T-290" ? "New wording for policy 4.2" : "New timing for step 4", kind: "text", required: true },
          { id: "effective", label: "Date it takes effect", kind: "date", required: true },
        ],
        options: [{ id: "fix", label: t.id === "T-290" ? "Update the policy" : "Update the procedure", next: "Elena Petrova re-checks coverage for provisional credit.", primary: true }],
      };
    }
    case "T-286":
      return {
        ...base,
        needed: [
          { id: "date", label: "Retest date", kind: "date", required: true },
          { id: "scope", label: "What the retest covers", kind: "text", required: false },
        ],
        options: [{ id: "plan", label: "Add to the test plan", next: "Assurance retests CTL-153 after go-live.", primary: true }],
      };
    default:
      return { ...base, options: [{ id: "done", label: "Mark as done", next: "Closes the task.", primary: true }] };
  }
}

function nextFor(h: Handoff, option: string) {
  const sender = userById(h.from_user_id)?.name;
  if (h.id === "H-118") return option === "fix" ? `${sender} sees your wording; RC-2026-016 can move to Covered.` : option === "dispute" ? `${sender} reviews your reason before anything changes.` : "You pick someone else to answer.";
  if (h.id === "H-117") return "D6 is decided, and CTL-153 goes to Anthony Marsh for sign-off.";
  if (h.id === "H-116") return option === "approve" ? "CTL-153 goes into force; 3 vendor reviews and a test plan change start." : `${sender} gets CTL-153 back with your reason.`;
  if (h.id === "H-115") return option === "upload" ? "CTL-132 counts as fresh again." : "Ravi Sethuraman logs a control failure.";
  if (h.id === "H-114") return "Madison decides whether 12 CFR 339.3 applies.";
  if (h.id === "H-113") return "RC-2026-014 can close once every vendor has answered.";
  return `${sender} is told.`;
}

/** Task kinds the data uses, with a fallback for older tasks. */
export function kindOf(t: Task) {
  return (t.kind ?? "review") as NonNullable<Task["kind"]>;
}
