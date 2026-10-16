import { Page } from "@/components/layout/page";
import { ruleChanges } from "@/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return ruleChanges.map((x) => ({ id: x.id }));
}

export default async function P({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Page><h1 className="t-page">Change {id}</h1></Page>;
}
