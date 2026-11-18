export interface CategorizedAmount {
  category: string;
  amountCents: number;
}

export interface CategoryChange {
  category: string;
  direction: 'up' | 'down';
  amountCents: number;
}

const MIN_CHANGE_CENTS = 100;

// Spending per category: money out is negative, so spend is the negated sum.
// Income is not spending. Refunds in a category reduce its spend.
function spendByCategory(items: CategorizedAmount[]): Map<string, number> {
  const spend = new Map<string, number>();
  for (const { category, amountCents } of items) {
    if (category === 'income') continue;
    spend.set(category, (spend.get(category) ?? 0) - amountCents);
  }
  return spend;
}

export function computeCategoryChanges(
  previous: CategorizedAmount[],
  current: CategorizedAmount[],
): CategoryChange[] {
  const previousSpend = spendByCategory(previous);
  const currentSpend = spendByCategory(current);
  const categories = new Set([...previousSpend.keys(), ...currentSpend.keys()]);

  const changes: CategoryChange[] = [];
  for (const category of categories) {
    const difference = (currentSpend.get(category) ?? 0) - (previousSpend.get(category) ?? 0);
    if (Math.abs(difference) < MIN_CHANGE_CENTS) continue;
    changes.push({
      category,
      direction: difference > 0 ? 'up' : 'down',
      amountCents: Math.abs(difference),
    });
  }

  return changes.sort((a, b) => b.amountCents - a.amountCents);
}
