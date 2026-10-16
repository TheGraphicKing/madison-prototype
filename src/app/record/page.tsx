import { Suspense } from "react";
import { Record } from "@/components/record/record";

export const metadata = { title: "The record" };

export default function RecordPage() {
  return (
    <Suspense>
      <Record />
    </Suspense>
  );
}
