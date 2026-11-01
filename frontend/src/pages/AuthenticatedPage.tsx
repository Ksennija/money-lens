import type { CurrentUser } from '../api/session';
import ImportPage from './ImportPage';
import OverviewPage from './OverviewPage';

type AuthenticatedPageProps = { user: CurrentUser };

export default function AuthenticatedPage({ user }: AuthenticatedPageProps) {
  return (
    <main>
      <h1>Money Lens</h1>
      <p>Logged in as {user.email}</p>
      <OverviewPage />
      <ImportPage />
    </main>
  );
}
