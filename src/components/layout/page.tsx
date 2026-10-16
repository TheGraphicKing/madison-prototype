import { cn } from "@/lib/utils";

/** The page frame: 40 px gutters (20 on mobile), a 1320 px measure, generous top space. */
export function Page({ children, className, wide }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className={cn("mx-auto w-full gutter-x pt-10 pb-24 max-md:pt-6", wide ? "max-w-[1600px]" : "max-w-[1400px]", className)}>
      {children}
    </div>
  );
}

/** Space between page sections: 56 px. */
export function Section({ children, className, id, label }: { children: React.ReactNode; className?: string; id?: string; label?: string }) {
  return (
    <section id={id} aria-label={label} className={cn("mt-14 first:mt-0", className)}>
      {children}
    </section>
  );
}
