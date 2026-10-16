import { duties } from "@/data";
import { Suspense } from "react";
import { ObligationRoom } from "@/components/obligations/obligation-room";

export const dynamicParams = false;

export function generateStaticParams() {
  return duties.map((x) => ({ id: x.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${id} · ${duties.find((d) => d.id === id)?.plain ?? ""}` };
}

export default async function ObligationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <ObligationRoom id={id} />
    </Suspense>
  );
}
