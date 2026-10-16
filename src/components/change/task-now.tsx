"use client";

import { useRouter } from "next/navigation";
import type { RuleChange } from "@/data/types";
import { driftFlags, dutiesFor, getDuty, institution, ruleSections, userById, type PersonaId } from "@/data";
import { useStore } from "@/lib/store";
import { demoNowIso, fmtDate } from "@/lib/dates";
import { Button, ButtonLink } from "@/components/core/button";
import { MonoLabel } from "@/components/core/labels";
import { Diff } from "@/components/change/diff";
import { DriftPair } from "@/components/change/drift-pair";
import { PersonTag } from "@/components/core/tags";
import { Square } from "@/components/core/mark";

type Task = {
  label: string;
  title: string;
  why: string;
  evidence?: React.ReactNode;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; href?: string; onClick?: () => void };
  quiet?: boolean;
};

/** The one decision this persona must make on this change, with the evidence beside it. */
export function useTaskNow(c: RuleChange): Task {
  const router = useRouter();
  const persona = useStore((s) => s.persona) as PersonaId;
  const finished = useStore((s) => s.finishedRuns);
  const decisions = useStore((s) => s.decisions);
  const decide = useStore((s) => s.decide);
  const overrideChange = useStore((s) => s.overrideChange);
  const toast = useStore((s) => s.toast);
  const facts = useStore((s) => s.facts);
  const answerFact = useStore((s) => s.answerFact);
  const me = userById(persona)!;
  const did = (label: string) => decisions.some((d) => d.changeId === c.id && d.label === label);
  const act = (label: string, text: string, extra?: () => void) => {
    const at = demoNowIso();
    decide({ label, text, by: persona, at, changeId: c.id });
    extra?.();
    toast(text);
  };
  const start = (runId: string) => router.push(`/runs/${runId}/?mode=live&from=/rules/${c.id}/`);
  const changedSections = ruleSections.filter((s) => s.change_id === c.id && s.changed);

  if (c.id === "RC-2026-014") {
    if (!finished["run-rule-1005"]) {
      return {
        label: "Your task now",
        title: "Run Madison on this rule",
        why: "The amended text is in. Madison reads it, finds the obligations and checks each one twice. You decide before anything is accepted.",
        evidence: (
          <div className="flex flex-col gap-4">
            <MonoLabel>What changed · {changedSections.length} sections</MonoLabel>
            {changedSections.map((s) => (
              <div key={s.id}>
                <div className="t-data text-[11.5px] text-ink2">
                  {s.section_number} · {s.heading}
                </div>
                <p className="mt-1 text-[14px] leading-[22px]">
                  <Diff before={s.before} after={s.after} />
                </p>
              </div>
            ))}
          </div>
        ),
        primary: { label: "Run Madison on this rule", onClick: () => start("run-rule-1005") },
        secondary: { label: "About 31 seconds · 9 agents and one person" },
      };
    }
    const assign = "Ask Margaret Ellison to fix policy 4.2 and step 4";
    const sign = "Sign off the impact";
    const dr = driftFlags.find((d) => d.id === "DR-031")!;
    if (persona === "u-anthony") {
      return did(sign)
        ? { label: "Signed", title: "You signed off the impact", why: `Signed as ${me.name}. The gap and the drift stay open until Margaret Ellison's fix is in.`, quiet: true }
        : {
            label: "Needs your sign-off",
            title: "Sign off the impact of 12 CFR 1005.11(c)",
            why: "6 duties, 4 policy sections, 2 procedure steps, 5 controls and 3 vendors are touched. One duty has nothing behind it yet.",
            evidence: <DriftPair drift={dr} stacked />,
            primary: { label: sign, onClick: () => act(sign, `Signed off the impact of ${c.citation}`) },
          };
    }
    if (did(assign)) {
      return {
        label: "With Margaret Ellison",
        title: "Waiting for the policy and procedure fix",
        why: "Margaret Ellison owns POL-DISP-01 and PRC-DISP-06. When both say 5 business days, the obligation can be linked and covered.",
        evidence: <DriftPair drift={dr} stacked />,
        quiet: true,
        secondary: { label: "See it in the record", href: `/record/?change=${c.id}` },
      };
    }
    return {
      label: "Your task now",
      title: "Fix the gap on provisional credit",
      why: `Provisional credit within 5 business days (D-1005-E2) has nothing behind it. The policy says 10 business days and the procedure says day 7.`,
      evidence: <DriftPair drift={dr} stacked />,
      primary: { label: assign, onClick: () => act(assign, `Asked Margaret Ellison to fix POL-DISP-01 4.2 and PRC-DISP-06 step 4 for ${c.citation}`) },
      secondary: { label: "Open what it touches", href: `/rules/${c.id}/?touches=1` },
    };
  }

  if (c.id === "RC-2026-011") {
    if (!finished["run-design-mfa"]) {
      const d = getDuty("D-208-M1")!;
      return {
        label: persona === "u-anthony" ? "In design" : "Your task now",
        title: "Choose a fix for the MFA gap",
        why: "No control requires phishing-resistant MFA for privileged access, including vendors. Due 1 Dec 2026.",
        evidence: (
          <div className="flex flex-col gap-3">
            <MonoLabel>The rule&apos;s words · {d.citation}</MonoLabel>
            <blockquote className="border-l-2 border-ink pl-4 text-[14px] leading-[22px]">&ldquo;{d.source_text}&rdquo;</blockquote>
            <MonoLabel>What the bank has now</MonoLabel>
            <p className="text-[14px] leading-[22px] text-ink2">POL-ISP-01 3.1 asks for multi-factor authentication of any type. PRC-ISP-02 step 3 enrols privileged accounts in the bank&apos;s authenticator app.</p>
          </div>
        ),
        primary: { label: "Choose a fix", onClick: () => start("run-design-mfa") },
        secondary: { label: "Madison suggests the smallest fix, then runs seven design checks" },
      };
    }
    const close = "Close this change";
    if (c.state === "closed") return { label: "Closed", title: "This change is closed", why: `Closed during this demo.`, quiet: true };
    return persona === "u-anthony"
      ? {
          label: "Needs your decision",
          title: "Close this change",
          why: "CTL-153 is in force and D-208-M1 has a control behind it. One obligation, privileged session logging, is not yet confirmed: CTL-152 has been quiet for 77 days.",
          primary: { label: close, onClick: () => act(close, `Closed ${c.citation}`, () => overrideChange(c.id, { state: "closed", step: "close" })) },
        }
      : {
          label: "Done",
          title: "CTL-153 is in force",
          why: "Three vendors are asked to prove phishing-resistant MFA, and Assurance has the test plan change. Anthony Marsh can close the change.",
          quiet: true,
          secondary: { label: "See how Madison got here", href: `/runs/run-design-mfa/?mode=replay&from=/rules/${c.id}/` },
        };
  }

  if (c.id === "RC-2026-016") {
    if (!finished["run-coverage-1026"]) {
      const dr = driftFlags.find((d) => d.id === "DR-029")!;
      return {
        label: "Your task now",
        title: "Confirm 2 proposed links",
        why: "The policy matches the rule, but the procedure allows 5 business days. Madison checks again, then you confirm.",
        evidence: <DriftPair drift={dr} stacked />,
        primary: { label: "Check coverage and confirm", onClick: () => start("run-coverage-1026") },
      };
    }
    return { label: "Done", title: "Linked, and the drift is with Grace Liu", why: "POL-MTG-02 3.1 is linked to the revised Loan Estimate duty. PRC-MTG-03 step 2 still says 5 business days.", quiet: true };
  }

  if (c.state === "duties") {
    const n = dutiesFor(c.id).length;
    const label = `Accept ${n} obligations`;
    if (did(label)) return { label: "Done", title: `${n} obligations accepted`, why: "Madison is matching them to policies and controls.", quiet: true };
    return {
      label: "Your task now",
      title: `Accept ${n} Truth in Savings obligations`,
      why: "Proposed by Madison, checked by the quote check and the reviewer. Waiting for review.",
      primary: { label, onClick: () => act(label, `Accepted ${n} obligations for ${c.citation}`, () => overrideChange(c.id, { state: "linked", step: "linked" })) },
    };
  }

  if (c.state === "uncertain") {
    const f = facts["flood_zone_lending"];
    if (f) return { label: "Answered", title: `Flood zone lending: ${f.value}`, why: `Answered by ${userById(f.by)?.name}. Scope is now ${f.value === "Yes" ? "Applies" : "Doesn't apply"}.`, quiet: true };
    const answer = (v: "Yes" | "No") =>
      act(`Answer: ${v}`, `Answered flood zone lending: ${v.toLowerCase()} for ${c.citation}`, () => {
        answerFact("flood_zone_lending", v, persona, demoNowIso());
        overrideChange(c.id, v === "Yes" ? { state: "applies", step: "duties" } : { state: "screened_out" });
      });
    return {
      label: "Needs one bank fact",
      title: "Does Northgate lend in special flood hazard areas?",
      why: `${c.screen_reason} The bank profile has no answer (flood_zone_lending is empty, retrieved ${fmtDate(institution.profile_retrieved_at)}).`,
      primary: { label: "Yes, we do", onClick: () => answer("Yes") },
      secondary: { label: "No, we don't", onClick: () => answer("No") },
    };
  }

  if (c.state === "screened_out") return { label: "Doesn't apply", title: "Nothing to do", why: c.screen_reason ?? "Screened out.", quiet: true };
  if (c.state === "closed") return { label: "Closed", title: "This change is closed", why: `Closed by ${userById(c.closed_by ?? "")?.name} on ${fmtDate(c.closed_at)}.`, quiet: true };
  return { label: "Next", title: "Find the obligations", why: `It applies to Northgate. ${userById(c.owner_id)?.name} owns the next step.`, quiet: true };
}

export function TaskNow({ change }: { change: RuleChange }) {
  const t = useTaskNow(change);
  return (
    <Frame arm={14} color={t.quiet ? "var(--lineStrong)" : "var(--ink)"} className="bg-surface">
      <div className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] max-md:p-5">
        <div className="flex flex-col">
          <span className="flex items-center gap-2">
            <Square size={7} color={t.quiet ? "var(--ink3)" : "var(--highlight)"} style={t.quiet ? undefined : { boxShadow: "0 0 0 1px var(--ink)" }} />
            <MonoLabel variant="plain" tone={t.quiet ? undefined : "ink"}>
              {t.label}
            </MonoLabel>
          </span>
          <h2 className="mt-4 text-[26px] leading-[32px] font-medium tracking-[-0.015em]">{t.title}</h2>
          <p className="mt-3 max-w-[52ch] text-ink2">{t.why}</p>
          <div className="mt-auto flex flex-wrap items-center gap-4 pt-8">
            {t.primary ? (
              <Button variant="primary" size={40} onClick={t.primary.onClick}>
                {t.primary.label}
              </Button>
            ) : null}
            {t.secondary ? (
              t.secondary.href ? (
                <ButtonLink href={t.secondary.href} variant="text" size={40}>
                  {t.secondary.label}
                </ButtonLink>
              ) : t.secondary.onClick ? (
                <Button variant="quiet" size={40} onClick={t.secondary.onClick}>
                  {t.secondary.label}
                </Button>
              ) : (
                <span className="t-small text-ink3">{t.secondary.label}</span>
              )
            ) : null}
          </div>
        </div>
        {t.evidence ? <div className="min-w-0 border-l border-line pl-8 max-lg:border-l-0 max-lg:border-t max-lg:pt-6 max-lg:pl-0">{t.evidence}</div> : <OwnerNote change={change} />}
      </div>
    </Frame>
  );
}

function OwnerNote({ change }: { change: RuleChange }) {
  return (
    <div className="flex flex-col gap-3 border-l border-line pl-8 max-lg:border-l-0 max-lg:border-t max-lg:pt-6 max-lg:pl-0">
      <MonoLabel>Owner</MonoLabel>
      <PersonTag id={change.owner_id} showRole />
      <MonoLabel className="mt-3">Summary</MonoLabel>
      <p className="text-[14px] leading-[22px] text-ink2">{change.summary}</p>
    </div>
  );
}

/** A plain rounded surface (the corner brackets are gone in iteration 2). */
function Frame({ children, className, style, arm: _a, color: _c, as: _as, ...rest }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties; arm?: number; color?: string; as?: React.ElementType } & React.HTMLAttributes<HTMLDivElement>) {
  void _a;
  void _c;
  void _as;
  return (
    <div className={className} style={{ borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)", ...style }} {...rest}>
      {children}
    </div>
  );
}
