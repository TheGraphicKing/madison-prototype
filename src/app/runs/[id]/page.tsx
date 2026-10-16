import { Suspense } from "react";
import { runs } from "@/data";
import { RunRoute } from "./run-route";

export const dynamicParams = false;

export function generateStaticParams() {
  return runs.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: runs.find((r) => r.id === id)?.title ?? id };
}

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <RunRoute id={id} />
    </Suspense>
  );
}
