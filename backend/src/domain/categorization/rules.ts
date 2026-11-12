export const CATEGORIES = [
  'income',
  'housing',
  'utilities',
  'groceries',
  'eating-out',
  'subscriptions',
  'health',
  'transport',
  'shopping',
  'entertainment',
  'fees',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Rule = { keywords: string[]; category: Category };

// Ordered: the first rule with a matching keyword decides, so the order is part of the behaviour.
// Keywords are uppercase, without accents. One line per merchant can be added later.
export const rules: Rule[] = [
  { keywords: ['ACME', 'SALARY', 'REIMBURSEMENT'], category: 'income' },
  { keywords: ['SUNRISE ESTATES', 'RENT'], category: 'housing' },
  { keywords: ['STADTWERKE', 'ELECTRICITY'], category: 'utilities' },
  { keywords: ['REWE', 'EDEKA', 'LIDL', 'GROCERIES'], category: 'groceries' },
  { keywords: ['CAFE', 'TRATTORIA', 'RESTAURANT', 'COFFEE'], category: 'eating-out' },
  { keywords: ['NETFLIX', 'SPOTIFY'], category: 'subscriptions' },
  { keywords: ['FITLIFE', 'GYM', 'APOTHEKE', 'PHARMACY'], category: 'health' },
  { keywords: ['DEUTSCHE BAHN', 'TRAIN', 'SHELL', 'FUEL'], category: 'transport' },
  { keywords: ['AMAZON', 'ZARA', 'CLOTHING'], category: 'shopping' },
  { keywords: ['CINEMAXX', 'CINEMA'], category: 'entertainment' },
  { keywords: ['ACCOUNT FEE'], category: 'fees' },
];
