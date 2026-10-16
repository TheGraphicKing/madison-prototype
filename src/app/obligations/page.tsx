import { Suspense } from "react";
import { Register } from "@/components/obligations/register";

export const metadata = { title: "Duties" };

export default function DutiesPage() {
  return (
    <Suspense>
      <Register />
    </Suspense>
  );
}
