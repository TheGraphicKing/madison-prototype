import { getChange, getDuty, run } from "@/data";

export type Crumb = { label: string; href?: string };

const NAV: Record<string, string> = {
  "": "Today",
  rules: "Rule changes",
  coverage: "Coverage",
  duties: "Duties",
  tasks: "My tasks",
  reports: "Reports",
  record: "The record",
  gallery: "Design system",
  runs: "Agent runs",
};

/** Breadcrumb and title for the header, from the path. */
export function crumbsFor(pathname: string): { crumbs: Crumb[]; title: string } {
  const parts = pathname.split("/").filter(Boolean);
  const top = parts[0] ?? "";
  const section = NAV[top] ?? "Madison";
  if (parts.length <= 1) {
    return { crumbs: [{ label: "Northgate Community Bank" }], title: section };
  }
  const id = decodeURIComponent(parts[1]);
  if (top === "rules") {
    const c = getChange(id);
    return { crumbs: [{ label: "Rule changes", href: "/rules/" }, { label: c?.citation ?? id }], title: c?.title ?? id };
  }
  if (top === "duties") {
    const d = getDuty(id);
    return { crumbs: [{ label: "Duties", href: "/duties/" }, { label: id }], title: d?.plain ?? id };
  }
  if (top === "runs") {
    const r = run(id);
    return { crumbs: [{ label: "Agent runs" }, { label: id }], title: r?.title ?? id };
  }
  if (top === "reports") {
    const t = id === "board-pack" ? "Board pack" : id === "exam" ? "Exam readiness" : id;
    return { crumbs: [{ label: "Reports", href: "/reports/" }], title: t };
  }
  return { crumbs: [{ label: section }], title: section };
}

export const NAV_ITEMS: { href: string; label: string; match: string }[] = [
  { href: "/", label: "Today", match: "" },
  { href: "/rules/", label: "Rule changes", match: "rules" },
  { href: "/coverage/", label: "Coverage", match: "coverage" },
  { href: "/duties/", label: "Duties", match: "duties" },
  { href: "/tasks/", label: "My tasks", match: "tasks" },
  { href: "/reports/", label: "Reports", match: "reports" },
  { href: "/record/", label: "The record", match: "record" },
];
