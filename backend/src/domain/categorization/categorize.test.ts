import { categorize } from './categorize.js';
import { CATEGORIES, rules } from './rules.js';

const sample: Array<[string, string, number, string]> = [
  ['Acme GmbH', 'Salary August', 320000, 'income'],
  ['Acme GmbH', 'Expense reimbursement', 8500, 'income'],
  ['Sunrise Estates', 'Rent August', -110000, 'housing'],
  ['Stadtwerke', 'Electricity August', -6500, 'utilities'],
  ['REWE Markt', 'Card payment groceries', -5437, 'groceries'],
  ['Lidl', 'Card payment groceries', -2310, 'groceries'],
  ['Café Luna', 'Card payment coffee', -380, 'eating-out'],
  ['Trattoria Roma', 'Card payment dinner', -4200, 'eating-out'],
  ['Netflix', 'Subscription', -1299, 'subscriptions'],
  ['Spotify', 'Subscription', -999, 'subscriptions'],
  ['FitLife', 'Gym membership', -2990, 'health'],
  ['Apotheke', 'Pharmacy', -1450, 'health'],
  ['Deutsche Bahn', 'Train ticket', -4990, 'transport'],
  ['Shell', 'Fuel', -6000, 'transport'],
  ['Amazon', 'Order', -3499, 'shopping'],
  ['Amazon', 'Refund', 1899, 'shopping'],
  ['Zara', 'Clothing', -5900, 'shopping'],
  ['Cinemaxx', 'Cinema tickets', -2400, 'entertainment'],
  ['Bank', 'Account fee', -490, 'fees'],
  ['Anna Weber', 'Transfer dinner split', -2500, 'other'],
];

const text = (counterparty: string, details = '', amountCents = -100) => ({
  counterparty,
  details,
  amountCents,
});

describe('categorize', () => {
  it.each(sample)('puts %s "%s" (%d) into %s', (counterparty, details, amountCents, expected) => {
    expect(categorize({ counterparty, details, amountCents })).toBe(expected);
  });

  it('ignores case and accents', () => {
    expect(categorize(text('netflix'))).toBe('subscriptions');
    expect(categorize(text('CAFÉ LUNA'))).toBe('eating-out');
    expect(categorize(text('Cafe Luna'))).toBe('eating-out');
  });

  it('matches whole words only', () => {
    expect(categorize(text('Bank', 'Current account'))).toBe('other');
    expect(categorize(text('Shelley'))).toBe('other');
    expect(categorize(text('Shell'))).toBe('transport');
  });

  it('matches a multi-word keyword only when the words are next to each other', () => {
    expect(categorize(text('Bank', 'Account fee'))).toBe('fees');
    expect(categorize(text('Bank', 'Fee for the account'))).toBe('other');
  });

  it('ignores punctuation and extra spaces', () => {
    expect(categorize(text('Netflix.com'))).toBe('subscriptions');
    expect(categorize(text('REWE-Markt'))).toBe('groceries');
    expect(categorize(text('Deutsche   Bahn'))).toBe('transport');
  });

  it('searches the counterparty and the details together', () => {
    expect(categorize(text('Unknown', 'REWE'))).toBe('groceries');
  });

  it('lets the rule higher in the list win', () => {
    // Amazon is shopping, salary is income, and income is listed first.
    expect(categorize(text('Amazon', 'Salary'))).toBe('income');
  });

  it('keeps a refund that matches a shop in the shop category', () => {
    expect(categorize(text('Amazon', 'Refund', 1899))).toBe('shopping');
  });

  it('gives "income" to an unknown deposit', () => {
    expect(categorize(text('Anna Weber', 'Transfer', 2500))).toBe('income');
  });

  it('gives "other" to an unknown payment or a zero amount', () => {
    expect(categorize(text('Anna Weber', 'Transfer', -2500))).toBe('other');
    expect(categorize(text('Anna Weber', 'Transfer', 0))).toBe('other');
  });

  it('handles empty or symbol-only text by the sign of the amount', () => {
    expect(categorize(text('', '', -100))).toBe('other');
    expect(categorize(text('***', '---', -100))).toBe('other');
    expect(categorize(text('', '', 100))).toBe('income');
  });
});

describe('rules', () => {
  it('use existing categories, uppercase keywords and no empty keyword', () => {
    for (const rule of rules) {
      expect(CATEGORIES).toContain(rule.category);
      expect(rule.keywords.length).toBeGreaterThan(0);
      for (const keyword of rule.keywords) {
        expect(keyword).toBe(keyword.toUpperCase());
        expect(keyword.trim()).not.toBe('');
      }
    }
  });
});
