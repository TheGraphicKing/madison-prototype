// Bank words. The data model says "duty"; banks say "obligation". Every visible string passes
// through here when it comes from data that may carry the old word.
export function obligationWords(text: string): string {
  return text
    .replace(/\bDuties\b/g, "Obligations")
    .replace(/\bduties\b/g, "obligations")
    .replace(/\bDuty\b/g, "Obligation")
    .replace(/\bduty\b/g, "obligation");
}

export const obligationTitle = obligationWords;
