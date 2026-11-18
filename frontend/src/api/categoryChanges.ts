export type CategoryChange = {
  category: string;
  direction: 'up' | 'down';
  amountCents: number; // always positive; the direction says which way it moved
};

export type CategoryChanges = {
  month: string; // YYYY-MM of the latest transaction
  currency: string;
  hasTransactions: boolean;
  changes: CategoryChange[]; // already ranked by size, largest first
};

export type CategoryChangesResult =
  | { ok: true; categoryChanges: CategoryChanges }
  | { ok: false; code: string; message: string };

const SERVER_ERROR: CategoryChangesResult = {
  ok: false,
  code: 'server-error',
  message: 'Something went wrong',
};

function toChange(value: unknown): CategoryChange | null {
  const change = value as CategoryChange | null;
  if (
    typeof change?.category !== 'string' ||
    (change.direction !== 'up' && change.direction !== 'down') ||
    typeof change.amountCents !== 'number'
  ) {
    return null;
  }
  return { category: change.category, direction: change.direction, amountCents: change.amountCents };
}

export async function getCategoryChanges(): Promise<CategoryChangesResult> {
  try {
    const res = await fetch('/api/category-changes');
    const body = await res.json();

    if (res.ok) {
      if (
        typeof body?.month !== 'string' ||
        typeof body?.currency !== 'string' ||
        typeof body?.hasTransactions !== 'boolean' ||
        !Array.isArray(body?.changes)
      ) {
        return SERVER_ERROR;
      }
      const changes = body.changes.map(toChange);
      if (changes.some((change: CategoryChange | null) => change === null)) return SERVER_ERROR;
      return {
        ok: true,
        categoryChanges: {
          month: body.month,
          currency: body.currency,
          hasTransactions: body.hasTransactions,
          changes,
        },
      };
    }

    if (typeof body?.code !== 'string' || typeof body?.message !== 'string') {
      return SERVER_ERROR;
    }
    return { ok: false, code: body.code, message: body.message };
  } catch {
    return SERVER_ERROR;
  }
}
