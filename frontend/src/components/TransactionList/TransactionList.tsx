import type { Transaction } from "../../api/transactions";
import { categoryLabel } from "../../lib/categories";
import { formatDate } from "../../lib/dates";
import styles from "./TransactionList.module.scss";

// A transaction keeps the currency it was imported in. Money out gets a minus, money in a plus.
function formatSignedMoney(transaction: Transaction): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: transaction.currency,
    signDisplay: "exceptZero",
  }).format(transaction.amountCents / 100);
}

type TransactionListProps = { transactions: Transaction[] };

// One row per transaction, as in frontend/design/transactions.html and the recent transactions
// of frontend/design/overview.html: who, "Category · date" and the amount. There is no icon yet;
// the row has room for one in front of the details.
export default function TransactionList({ transactions }: TransactionListProps) {
  return (
    <ul className={styles.list}>
      {transactions.map((transaction) => (
        <li key={transaction.id} className={styles.item}>
          <div className={styles.details}>
            <strong>{transaction.counterparty}</strong>
            <span className={styles.meta}>
              {categoryLabel(transaction.category)} · {formatDate(transaction.date)}
            </span>
          </div>
          <strong className={transaction.amountCents > 0 ? styles.income : undefined}>
            {formatSignedMoney(transaction)}
          </strong>
        </li>
      ))}
    </ul>
  );
}
