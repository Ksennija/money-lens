import type { ReactNode } from "react";
import type { CurrentUser } from "../api/session";
import styles from "./AuthenticatedPage.module.scss";

type AuthenticatedPageProps = { user: CurrentUser; children: ReactNode };

// The layout of every signed-in page: the one main landmark and who is signed in.
// Each page brings its own h1.
export default function AuthenticatedPage({
  user,
  children,
}: AuthenticatedPageProps) {
  return (
    <main className={styles.page}>
      <p className={styles.user}>Logged in as {user.email}</p>
      {children}
    </main>
  );
}
