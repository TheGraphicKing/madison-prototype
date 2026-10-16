"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "quiet" | "text" | "highlight";
export type ButtonSize = 32 | 40;

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-sans font-medium transition-[background-color,color,box-shadow,transform] duration-[120ms] ease-(--ease) active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

function classes(variant: ButtonVariant, size: ButtonSize, loading?: boolean) {
  const sz = variant === "text" ? "h-auto px-0 text-[14px] leading-5" : size === 32 ? "h-8 px-3 text-[13px] rounded-[10px]" : "h-10 px-4 text-[14px] rounded-[10px]";
  const v =
    variant === "primary"
      ? "bg-accent text-accent-ink hover:opacity-90"
      : variant === "highlight"
        ? "bg-highlight text-highlight-ink hover:opacity-95"
        : variant === "quiet"
          ? "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--lineStrong)] hover:bg-surface2"
          : "bg-transparent text-ink underline-offset-4 decoration-1 hover:underline active:scale-100";
  return cn(base, sz, v, loading && "pointer-events-none");
}

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, Common & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function Button({ variant = "quiet", size = 40, loading, className, children, ...rest }, ref) {
    return (
      <button ref={ref} className={cn(classes(variant, size, loading), className)} aria-busy={loading || undefined} {...rest}>
        {loading ? <LoadingSquares /> : null}
        <span className={cn(loading && "opacity-60")}>{children}</span>
      </button>
    );
  },
);

export function ButtonLink({
  href,
  variant = "quiet",
  size = 40,
  className,
  children,
  ...rest
}: Common & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={cn(classes(variant, size), className)} {...rest}>
      {children}
    </Link>
  );
}

/** Loading: three squares filling in turn. */
function LoadingSquares() {
  return (
    <span aria-hidden className="inline-flex gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span key={i} className="breathe block size-[4px] bg-current" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </span>
  );
}
