import { duties } from "@/data";
import { DutyRoom } from "@/components/obligations/duty-room";

export const dynamicParams = false;

export function generateStaticParams() {
  return duties.map((x) => ({ id: x.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${id} · ${duties.find((d) => d.id === id)?.plain ?? ""}` };
}

export default async function DutyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DutyRoom id={id} />;
}
