import type { CategoryChange } from '../api/categoryChanges';
import { categoryLabel } from '../lib/categories';

type Props = {
  changes: CategoryChange[]; // already ranked by size, largest first
  currency: string;
};

// Whole euros, rounded half up. The sign is in the arrow, so the amount is always positive.
function formatWholeMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function CategoryChanges({ changes, currency }: Props) {
  return (
    <section>
      <h2>{`🔎 ${changes.length} ${changes.length === 1 ? 'thing' : 'things'} changed this month`}</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr key={change.category}>
              <td>{categoryLabel(change.category)}</td>
              <td>
                {change.direction === 'up' ? '↑' : '↓'} {formatWholeMoney(change.amountCents, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
