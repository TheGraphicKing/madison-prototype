import { Page } from "@/components/layout/page";
import { duties } from "@/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return duties.map((x) => ({ id: x.id }));
}

export default async function P({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Page><h1 className="t-page">Duty {id}</h1></Page>;
}
