/**
 * Word diff between two versions of a rule's text: removed words struck through in
 * --risk, added words underlined in --ok. Longest common subsequence over words.
 */
export function diffWords(before: string, after: string) {
  const a = before.split(/(\s+)/);
  const b = after.split(/(\s+)/);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: { t: "same" | "del" | "add"; s: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ t: "same", s: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ t: "del", s: a[i++] });
    else out.push({ t: "add", s: b[j++] });
  }
  while (i < n) out.push({ t: "del", s: a[i++] });
  while (j < m) out.push({ t: "add", s: b[j++] });
  // merge runs
  const merged: typeof out = [];
  for (const p of out) {
    const last = merged[merged.length - 1];
    if (last && last.t === p.t) last.s += p.s;
    else merged.push({ ...p });
  }
  return merged;
}

export function Diff({ before, after, onlyChanges }: { before: string; after: string; onlyChanges?: boolean }) {
  const parts = diffWords(before, after);
  return (
    <>
      {parts.map((p, i) => {
        if (p.t === "same") {
          if (onlyChanges && p.s.trim().split(/\s+/).length > 6) {
            const words = p.s.split(/(\s+)/);
            const head = i === 0 ? "" : words.slice(0, 6).join("");
            const tail = i === parts.length - 1 ? "" : words.slice(-6).join("");
            return (
              <span key={i} className="text-ink2">
                {head}
                <span className="text-ink3"> … </span>
                {tail}
              </span>
            );
          }
          return <span key={i}>{p.s}</span>;
        }
        if (!p.s.trim()) return <span key={i}>{p.s}</span>;
        return p.t === "del" ? (
          <del key={i} className="mr-1 text-risk decoration-risk decoration-1" aria-label={`removed: ${p.s}`}>
            {p.s}
          </del>
        ) : (
          <ins key={i} className="bg-ok-soft text-ok no-underline underline decoration-ok decoration-1 underline-offset-[3px]" aria-label={`added: ${p.s}`}>
            {p.s}
          </ins>
        );
      })}
    </>
  );
}
