import { duties } from "@/data";
import { Redirect } from "@/components/shell/redirect";

export const dynamicParams = false;

export function generateStaticParams() {
  return duties.map((x) => ({ id: x.id }));
}

export default async function OldObligation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Redirect to={`/obligations/${id}/`} />;
}
