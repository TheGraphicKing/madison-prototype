import { cn } from "@/lib/utils";
import { MonoLabel } from "./labels";

/** A surface with a 1 px hairline and an optional header row: title, mono subtitle, actions. */
export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  as: Tag = "section",
  flush,
  id,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: React.ElementType;
  flush?: boolean;
  id?: string;
}) {
  const hasHeader = title || subtitle || actions;
  return (
    <Tag id={id} className={cn("rounded-[4px] border border-line bg-surface", className)}>
      {hasHeader ? (
        <header className="flex min-h-[56px] items-center justify-between gap-6 border-b border-line px-6 py-3">
          <div className="flex min-w-0 flex-col gap-1">
            {title ? <h2 className="t-section truncate">{title}</h2> : null}
            {subtitle ? typeof subtitle === "string" ? <MonoLabel>{subtitle}</MonoLabel> : subtitle : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn(flush ? "" : "p-6", bodyClassName)}>{children}</div>
    </Tag>
  );
}

/** Section heading outside panels: title plus optional mono subtitle and actions. */
export function SectionHead({
  title,
  subtitle,
  actions,
  className,
  id,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-6", className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 id={id} className="t-section">
          {title}
        </h2>
        {subtitle ? typeof subtitle === "string" ? <MonoLabel>{subtitle}</MonoLabel> : subtitle : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-4">{actions}</div> : null}
    </div>
  );
}
