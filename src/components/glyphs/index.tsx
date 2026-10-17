// Madison's own glyphs: a 20×20 viewBox, 1.5 px stroke, round caps and joins, currentColor,
// drawn only from squares, rounded squares, circles, rings and straight or right-angle lines.
// No icon library, no pictograms of objects.
import { cn } from "@/lib/utils";

type GlyphProps = { size?: number; className?: string; title?: string };

function G({ size = 20, className, title, children }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("inline-block shrink-0", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

const fill = { fill: "currentColor", stroke: "none" } as const;

// ---- Navigation (7) ----

/** Today: a ring with a small filled square in its centre. */
export const GlyphToday = (p: GlyphProps) => (
  <G {...p}>
    <circle cx="10" cy="10" r="7" />
    <rect x="8" y="8" width="4" height="4" rx="1" {...fill} />
  </G>
);

/** Rule changes: three horizontal lines with a small square on the top line. */
export const GlyphRules = (p: GlyphProps) => (
  <G {...p}>
    <rect x="3" y="4" width="3.5" height="3.5" rx="0.8" {...fill} />
    <path d="M9 5.75H17M4 10H17M4 14.25H17" />
  </G>
);

/** Coverage: a 3×3 grid of small squares, one of them filled. */
export const GlyphCoverage = (p: GlyphProps) => (
  <G {...p}>
    {[0, 1, 2].flatMap((r) =>
      [0, 1, 2].map((c) =>
        r === 0 && c === 2 ? (
          <rect key={`${r}${c}`} x={3 + c * 5} y={3 + r * 5} width="4" height="4" rx="1" {...fill} />
        ) : (
          <rect key={`${r}${c}`} x={3.5 + c * 5} y={3.5 + r * 5} width="3" height="3" rx="0.8" />
        ),
      ),
    )}
  </G>
);

/** Obligations: two lines, each with a small hollow square to its left. */
export const GlyphObligations = (p: GlyphProps) => (
  <G {...p}>
    <rect x="3" y="4" width="4" height="4" rx="1" />
    <rect x="3" y="12" width="4" height="4" rx="1" />
    <path d="M10 6H17M10 14H17" />
  </G>
);

/** My tasks: a rounded square with a short tick inside. */
export const GlyphTasks = (p: GlyphProps) => (
  <G {...p}>
    <rect x="3" y="3" width="14" height="14" rx="3.5" />
    <path d="M7 10.2L9.2 12.4L13.2 8" />
  </G>
);

/** Reports: a page with one folded corner and two lines. */
export const GlyphReports = (p: GlyphProps) => (
  <G {...p}>
    <path d="M5 3H12L15.5 6.5V17H5Z" />
    <path d="M12 3V6.5H15.5" />
    <path d="M7.5 10.5H13M7.5 13.5H11.5" />
  </G>
);

/** The record: three small squares joined by a line (a chain). */
export const GlyphRecord = (p: GlyphProps) => (
  <G {...p}>
    <rect x="2" y="8" width="4" height="4" rx="1" />
    <rect x="8" y="8" width="4" height="4" rx="1" {...fill} />
    <rect x="14" y="8" width="4" height="4" rx="1" />
    <path d="M6 10H8M12 10H14" />
  </G>
);

// ---- Task types ----

/** Decide: a ring, then a line that forks at a right angle. */
export const GlyphDecide = (p: GlyphProps) => (
  <G {...p}>
    <circle cx="5" cy="10" r="2.5" />
    <path d="M7.5 10H11M11 5V15M11 5H16M11 15H16" />
  </G>
);

/** Review: a rounded square holding two lines. */
export const GlyphReview = (p: GlyphProps) => (
  <G {...p}>
    <rect x="3" y="3" width="14" height="14" rx="3.5" />
    <path d="M7 8.5H13M7 11.5H11" />
  </G>
);

/** Answer: a ring with a short line and a dot inside. */
export const GlyphAnswer = (p: GlyphProps) => (
  <G {...p}>
    <circle cx="10" cy="10" r="7" />
    <path d="M7 9H13" />
    <circle cx="10" cy="12.5" r="0.9" {...fill} />
  </G>
);

/** Sign off: a ring on a baseline, with a right-angle stroke to it. */
export const GlyphSignOff = (p: GlyphProps) => (
  <G {...p}>
    <path d="M3 16H17" />
    <path d="M5 13V7H11" />
    <circle cx="13.5" cy="7" r="2.5" />
  </G>
);

/** Upload evidence: a tray, and a line rising from it to a small square. */
export const GlyphUpload = (p: GlyphProps) => (
  <G {...p}>
    <path d="M3 11V16H17V11" />
    <path d="M10 13V7" />
    <rect x="8" y="3" width="4" height="4" rx="1" {...fill} />
  </G>
);

/** Fix: two squares out of line, brought together by a right-angle line. */
export const GlyphFix = (p: GlyphProps) => (
  <G {...p}>
    <rect x="3" y="3" width="5" height="5" rx="1.2" />
    <rect x="12" y="12" width="5" height="5" rx="1.2" {...fill} />
    <path d="M8 5.5H14.5V12" />
  </G>
);

/** Vendor review: a square inside, a ring outside, joined by a line. */
export const GlyphVendor = (p: GlyphProps) => (
  <G {...p}>
    <rect x="3" y="7" width="6" height="6" rx="1.5" />
    <path d="M9 10H12" />
    <circle cx="14.5" cy="10" r="2.5" />
  </G>
);

/** Follow up: a ring with a line from its centre to a small square. */
export const GlyphFollowUp = (p: GlyphProps) => (
  <G {...p}>
    <circle cx="8" cy="10" r="5" />
    <path d="M8 10H15" />
    <rect x="14.5" y="8.5" width="3" height="3" rx="0.8" {...fill} />
  </G>
);

/** Control run: four squares, one filled (a repeated check). */
export const GlyphControlRun = (p: GlyphProps) => (
  <G {...p}>
    <rect x="3.5" y="3.5" width="5" height="5" rx="1.2" {...fill} />
    <rect x="11.5" y="3.5" width="5" height="5" rx="1.2" />
    <rect x="3.5" y="11.5" width="5" height="5" rx="1.2" />
    <rect x="11.5" y="11.5" width="5" height="5" rx="1.2" />
  </G>
);

/** Approve report: a page with a tick. */
export const GlyphApprove = (p: GlyphProps) => (
  <G {...p}>
    <path d="M5 3H12L15.5 6.5V17H5Z" />
    <path d="M7.5 11.5L9.3 13.3L12.8 9.6" />
  </G>
);

/** Test plan: a square and three dots in a line. */
export const GlyphTestPlan = (p: GlyphProps) => (
  <G {...p}>
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <circle cx="5" cy="15.5" r="1" {...fill} />
    <circle cx="10" cy="15.5" r="1" {...fill} />
    <circle cx="15" cy="15.5" r="1" {...fill} />
  </G>
);

// ---- Controls ----

/** A chevron drawn as two strokes, for the rail toggle. */
export const GlyphChevron = ({ dir = "left", ...p }: GlyphProps & { dir?: "left" | "right" }) => (
  <G {...p}>
    <path d={dir === "left" ? "M12 5L7 10L12 15" : "M8 5L13 10L8 15"} />
  </G>
);

export const NAV_GLYPHS = {
  "": GlyphToday,
  rules: GlyphRules,
  coverage: GlyphCoverage,
  obligations: GlyphObligations,
  tasks: GlyphTasks,
  reports: GlyphReports,
  record: GlyphRecord,
} as const;

export type TaskKind =
  | "decide"
  | "review"
  | "answer"
  | "sign_off"
  | "upload_evidence"
  | "fix"
  | "vendor_review"
  | "follow_up"
  | "control_run"
  | "approve_report"
  | "test_plan";

export const TASK_GLYPHS: Record<TaskKind, (p: GlyphProps) => React.ReactElement> = {
  decide: GlyphDecide,
  review: GlyphReview,
  answer: GlyphAnswer,
  sign_off: GlyphSignOff,
  upload_evidence: GlyphUpload,
  fix: GlyphFix,
  vendor_review: GlyphVendor,
  follow_up: GlyphFollowUp,
  control_run: GlyphControlRun,
  approve_report: GlyphApprove,
  test_plan: GlyphTestPlan,
};

export const TASK_KIND_LABEL: Record<TaskKind, string> = {
  decide: "Decide",
  review: "Review",
  answer: "Answer",
  sign_off: "Sign off",
  upload_evidence: "Upload evidence",
  fix: "Fix",
  vendor_review: "Vendor review",
  follow_up: "Follow up",
  control_run: "Control run",
  approve_report: "Approve report",
  test_plan: "Test plan",
};

/** A task-type glyph on a soft rounded tile, for rows and drawers. */
export function TaskGlyph({ kind, size = 34, className }: { kind: TaskKind; size?: number; className?: string }) {
  const C = TASK_GLYPHS[kind] ?? GlyphReview;
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-[10px] bg-surface2 text-ink", className)}
      style={{ width: size, height: size }}
      title={TASK_KIND_LABEL[kind]}
    >
      <C size={Math.round(size * 0.55)} />
    </span>
  );
}

/** Demos: a ring with a play wedge made of right-angle lines, then a short track. */
export const GlyphDemos = (p: GlyphProps) => (
  <G {...p}>
    <circle cx="10" cy="10" r="7" />
    <path d="M8.5 7v6l4.5-3z" {...fill} />
  </G>
);
