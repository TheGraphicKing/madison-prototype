// Bank words. The data model says "duty"; banks say "obligation". Every visible string passes
// through here when it comes from data that may carry the old word.
export function obligationWords(text: string): string {
  return text
    .replace(/\bDuties\b/g, "Obligations")
    .replace(/\bduties\b/g, "obligations")
    .replace(/\bDuty\b/g, "Obligation")
    .replace(/\bduty\b/g, "obligation")
    .replace(/\bconsumer EFT\b/g, "consumer electronic transfers")
    .replace(/\bConsumer EFT\b/g, "Consumer electronic transfers")
    // internal process tags are not bank words: "(card_disputes)" is dropped
    .replace(/\s\([a-z]+(?:_[a-z]+)+\)/g, "");
}

export const obligationTitle = obligationWords;
