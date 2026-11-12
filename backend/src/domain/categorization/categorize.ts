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

export function categorize({ counterparty, details, amountCents }: CategorizableTransaction): Category {
  const haystack = normalize(`${counterparty} ${details}`);
  for (const rule of rules) {
    if (rule.keywords.some((keyword) => haystack.includes(normalize(keyword)))) return rule.category;
  }
  // No rule matched: money coming in is income, anything else is "other".
  return amountCents > 0 ? 'income' : 'other';
}
