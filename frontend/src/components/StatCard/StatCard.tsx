import { useId } from "react";
import styles from "./StatCard.module.scss";

// Green for good news, red for bad news. The words and the arrows carry the meaning too, so the
// colour is never the only signal.
export type Tone = "good" | "bad";

type StatCardProps = {
  label: string;
  value: string;
  valueTone?: Tone;
  change?: string; // e.g. "↑ €100.00 vs August"; there is no line when it is left out
  changeTone?: Tone;
};

function cx(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(" ");
}

// A summary card as in frontend/design/overview.html: a label, an amount and, when there is
// something to compare with, how it changed. It is an article named by its label.
export default function StatCard({
  label,
  value,
  valueTone,
  change,
  changeTone,
}: StatCardProps) {
  const labelId = useId();

  return (
    <article className={styles.card} aria-labelledby={labelId}>
      <p id={labelId} className={styles.label}>
        {label}
      </p>
      <p className={cx(styles.value, valueTone && styles[valueTone])}>{value}</p>
      {change && (
        <p className={cx(styles.change, changeTone && styles[changeTone])}>
          {change}
        </p>
      )}
    </article>
  );
}
