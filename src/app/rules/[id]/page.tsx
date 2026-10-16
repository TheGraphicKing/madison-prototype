import { Suspense } from "react";
import { ruleChanges } from "@/data";
import { ChangeRoom } from "@/components/change/change-room";

export const dynamicParams = false;

export function generateStaticParams() {
  return ruleChanges.map((x) => ({ id: x.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = ruleChanges.find((x) => x.id === id);
  return { title: c ? `${c.citation} · ${c.title}` : id };
}

export default async function ChangePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <ChangeRoom id={id} />
    </Suspense>
  );
}
