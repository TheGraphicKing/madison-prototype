import { Suspense } from "react";
import { Register } from "@/components/duties/register";

export const metadata = { title: "Duties" };

export default function DutiesPage() {
  return (
    <Suspense>
      <Register />
    </Suspense>
  );
}
