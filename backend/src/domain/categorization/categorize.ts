import { rules, type Category } from './rules.js';

export type CategorizableTransaction = {
  counterparty: string;
  details: string;
  amountCents: number;
};

// Uppercase, accents removed, anything that is not a letter or digit becomes one space.
// Padding with spaces lets a keyword match whole words only: " RENT " is not in " CURRENT ".
function normalize(text: string): string {
  const words = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return ` ${words} `;
}

// "reimbursement" is left out on purpose: an expense reimbursement from an employer is income.
const REFUND_KEYWORDS = ['REFUND', 'REVERSAL', 'ERSTATTUNG', 'RUCKERSTATTUNG', 'GUTSCHRIFT'];

export function categorize({ counterparty, details, amountCents }: CategorizableTransaction): Category {
  const haystack = normalize(`${counterparty} ${details}`);
  for (const rule of rules) {
    if (rule.keywords.some((keyword) => haystack.includes(normalize(keyword)))) return rule.category;
  }
  // No rule matched: money coming in is income, anything else is "other".
  // A deposit that says it is a refund is not income: it belongs with the spending it gives back.
  if (amountCents > 0 && !REFUND_KEYWORDS.some((keyword) => haystack.includes(normalize(keyword)))) {
    return 'income';
  }
  return 'other';
}
