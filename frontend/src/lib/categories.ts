export type CategoryOption = { id: string; label: string };

// The ids are the ones the server sends (backend/src/domain/categorization/rules.ts).
// The order is the order of the filter dropdown.
export const CATEGORIES: CategoryOption[] = [
  { id: 'income', label: 'Income' },
  { id: 'housing', label: 'Housing' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'groceries', label: 'Groceries' },
  { id: 'eating-out', label: 'Eating out' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'health', label: 'Health' },
  { id: 'transport', label: 'Transport' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'fees', label: 'Fees' },
  { id: 'other', label: 'Other' },
];

// An id the page does not know (a category added on the server later) is shown as words.
export function categoryLabel(id: string): string {
  const known = CATEGORIES.find((category) => category.id === id);
  if (known) return known.label;
  const words = id.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// For a sentence such as "No transactions in Groceries and Fees in September 2026." More than
// three names would make the sentence too long, so it says "the chosen categories" instead.
export function describeCategories(ids: string[]): string {
  if (ids.length > 3) return 'the chosen categories';
  const labels = ids.map(categoryLabel);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}
