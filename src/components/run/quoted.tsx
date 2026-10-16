/** Highlights the quoted sentence inside the rule's own words. */
export function Quoted({ text, quote }: { text: string; quote?: string }) {
  if (!quote) return <>{text}</>;
  const i = text.toLowerCase().indexOf(quote.toLowerCase().slice(0, 40));
  if (i < 0) return <>{text}</>;
  const end = Math.min(text.length, i + quote.length);
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[4px] bg-highlight px-0.5 text-highlight-ink">{text.slice(i, end)}</mark>
      {text.slice(end)}
    </>
  );
}
