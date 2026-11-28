import type { ReactNode } from "react";
import type { CurrentUser } from "../../api/session";
import styles from "./AuthenticatedLayout.module.scss";

type AuthenticatedLayoutProps = { user: CurrentUser; children: ReactNode };

// The layout of every signed-in page: the one main landmark and a bar with who is signed in.
// Each page brings its own h1. The bar has free space on its right, where a currency dropdown
// can go later.
export default function AuthenticatedLayout({
  user,
  children,
}: AuthenticatedLayoutProps) {
  return (
    <main className={styles.page}>
      <div className={styles.bar}>
        <p className={styles.user}>Logged in as {user.email}</p>
      </div>
      {children}
    </main>
  );
}
