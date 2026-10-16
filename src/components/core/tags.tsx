import { cn } from "@/lib/utils";
import { agentById, userById } from "@/data";
import { Square } from "./mark";

export function agentHue(hue: number | undefined) {
  if (!hue) return "var(--ink3)";
  return `var(--agent-${hue})`;
}

export function hueFor(agentOrPerson: string) {
  if (agentOrPerson.startsWith("person:") || agentOrPerson.startsWith("u-")) return "var(--person)";
  return agentHue(agentById(agentOrPerson)?.hue);
}

/** A 6 px square in the agent's hue, the plain name, then the id in mono. */
export function AgentTag({
  id,
  className,
  showId = false,
  short,
}: {
  id: string;
  className?: string;
  showId?: boolean;
  short?: boolean;
}) {
  if (id.startsWith("person:")) return <PersonTag id={id.slice(7)} className={className} />;
  if (id.startsWith("u-")) return <PersonTag id={id} className={className} />;
  const a = agentById(id);
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 whitespace-nowrap", className)}>
      <Square size={6} color={agentHue(a?.hue)} />
      <span className={cn("truncate", short ? "text-[12px] leading-4" : "t-small", "text-ink")}>{a?.name ?? id}</span>
      {showId ? <span className="t-data text-[11px] text-ink3">{id}</span> : null}
    </span>
  );
}

/** A 20 px circle with initials (no photo), plus the name. */
export function PersonTag({
  id,
  className,
  showName = true,
  size = 20,
  showRole,
}: {
  id: string;
  className?: string;
  showName?: boolean;
  size?: number;
  showRole?: boolean;
}) {
  const u = userById(id);
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 whitespace-nowrap", className)}>
      <Initials initials={u?.initials ?? "?"} size={size} />
      {showName ? (
        <span className="t-small truncate text-ink">
          {u?.name ?? id}
          {showRole && u ? <span className="text-ink3"> · {u.role}</span> : null}
        </span>
      ) : null}
    </span>
  );
}

export function Initials({ initials, size = 20, className, filled }: { initials: string; size?: number; className?: string; filled?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-mono font-medium", className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, Math.round(size * 0.4)),
        letterSpacing: "0.02em",
        color: filled ? "var(--surface)" : "var(--person)",
        background: filled ? "var(--person)" : "var(--surface)",
        boxShadow: filled ? undefined : "inset 0 0 0 1px var(--person)",
      }}
    >
      {initials}
    </span>
  );
}
