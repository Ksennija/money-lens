import { computeCategoryChanges } from './computeCategoryChanges.js';

// spec/samples/bank-export-sample.csv, 1-30 August (previous) and 1-30 September (current)
const august = [
  { category: 'income', amountCents: 320000 },
  { category: 'housing', amountCents: -110000 },
  { category: 'groceries', amountCents: -5437 },
  { category: 'eating-out', amountCents: -380 },
  { category: 'subscriptions', amountCents: -1299 },
  { category: 'utilities', amountCents: -6200 },
  { category: 'eating-out', amountCents: -380 },
  { category: 'transport', amountCents: -3990 },
  { category: 'groceries', amountCents: -2715 },
  { category: 'shopping', amountCents: -4899 },
  { category: 'shopping', amountCents: 1899 },
  { category: 'subscriptions', amountCents: -1099 },
  { category: 'eating-out', amountCents: -4650 },
  { category: 'health', amountCents: -2990 },
  { category: 'groceries', amountCents: -6102 },
  { category: 'transport', amountCents: -5840 },
  { category: 'other', amountCents: -2500 },
  { category: 'health', amountCents: -1425 },
];

const september = [
  { category: 'income', amountCents: 320000 },
  { category: 'housing', amountCents: -110000 },
  { category: 'groceries', amountCents: -7218 },
  { category: 'eating-out', amountCents: -380 },
  { category: 'subscriptions', amountCents: -1299 },
  { category: 'utilities', amountCents: -6200 },
  { category: 'eating-out', amountCents: -380 },
  { category: 'shopping', amountCents: -8995 },
  { category: 'groceries', amountCents: -3360 },
  { category: 'entertainment', amountCents: -2400 },
  { category: 'subscriptions', amountCents: -1099 },
  { category: 'eating-out', amountCents: -5870 },
  { category: 'health', amountCents: -2990 },
  { category: 'income', amountCents: 12000 },
  { category: 'groceries', amountCents: -6644 },
  { category: 'transport', amountCents: -6110 },
  { category: 'transport', amountCents: -3990 },
  { category: 'fees', amountCents: -490 },
];

describe('computeCategoryChanges', () => {
  it('lists the changed categories, ranked by absolute change (Test Case 1)', () => {
    expect(computeCategoryChanges(august, september)).toEqual([
      { category: 'shopping', direction: 'up', amountCents: 5995 },
      { category: 'groceries', direction: 'up', amountCents: 2968 },
      { category: 'other', direction: 'down', amountCents: 2500 },
      { category: 'entertainment', direction: 'up', amountCents: 2400 },
      { category: 'health', direction: 'down', amountCents: 1425 },
      { category: 'eating-out', direction: 'up', amountCents: 1220 },
      { category: 'fees', direction: 'up', amountCents: 490 },
      { category: 'transport', direction: 'up', amountCents: 270 },
    ]);
  });

  it('hides a change under 1 euro and keeps one of exactly 1 euro (Test Case 9)', () => {
    const current = [
      { category: 'fees', amountCents: -99 },
      { category: 'health', amountCents: -100 },
      { category: 'groceries', amountCents: -149 },
    ];

    expect(computeCategoryChanges([], current)).toEqual([
      { category: 'groceries', direction: 'up', amountCents: 149 },
      { category: 'health', direction: 'up', amountCents: 100 },
    ]);
  });
});
