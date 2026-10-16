"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Static-export redirect: replaces the URL on the client; the meta refresh covers no-JS. */
export function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${to}`} />
      <p className="p-10 text-ink2">
        This page moved to <a href={to} className="underline underline-offset-4">{to}</a>.
      </p>
    </>
  );
}
