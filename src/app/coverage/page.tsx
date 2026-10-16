import { Suspense } from "react";
import { Coverage } from "@/components/coverage/coverage";

export const metadata = { title: "Coverage" };

export default function CoveragePage() {
  return (
    <Suspense>
      <Coverage />
    </Suspense>
  );
}
