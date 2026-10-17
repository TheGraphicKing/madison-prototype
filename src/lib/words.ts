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
    .replace(/\s\([a-z]+(?:_[a-z]+)+\)/g, "")
    // any other raw field name reads as words: "flood_zone_lending" becomes "flood zone lending"
    .replace(/\b[a-z]+(?:_[a-z]+)+\b/g, (m) => m.replace(/_/g, " "));
}

/** A raw field name as a label: "flood_zone_lending" becomes "Flood zone lending". */
export function fieldWord(key: string) {
  const w = key.replace(/_/g, " ");
  return w.charAt(0).toUpperCase() + w.slice(1);
}

export const obligationTitle = obligationWords;

const PAST: Record<string, string> = {
  update: "Updated", send: "Sent", approve: "Approved", accept: "Accepted", confirm: "Confirmed", record: "Recorded", renew: "Renewed",
  close: "Closed", add: "Added", upload: "Uploaded", mark: "Marked", go: "Went", choose: "Chose", run: "Ran", link: "Linked",
  review: "Reviewed", nudge: "Nudged", answer: "Answered", sign: "Signed", plan: "Planned", reject: "Rejected", raise: "Raised", check: "Checked",
};
/** A button's command as a toast: "Update the procedure" becomes "Updated the procedure". */
export function pastTense(label: string) {
  const [first, ...rest] = label.split(" ");
  const p = PAST[first.toLowerCase()];
  if (/^the .* is right/i.test(label)) return "Sent your reason";
  return p ? [p, ...rest].join(" ") : label;
}
