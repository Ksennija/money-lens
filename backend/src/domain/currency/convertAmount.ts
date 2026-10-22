// Converts a signed amount in cents using a rate (1 unit of source = rate units of target).
// Rounds half away from zero so a refund converts to exactly the negative of the matching payment.
export function convertAmountCents(amountCents: number, rate: number): number {
  const converted = Math.round(Math.abs(amountCents) * rate);
  return amountCents < 0 ? -converted : converted;
}
