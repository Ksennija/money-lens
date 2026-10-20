import { useState } from 'react';
import { logoutUser, type CurrentUser } from '../api/session';
import ImportPage from './ImportPage';

type AuthenticatedPageProps = { user: CurrentUser; onLoggedOut: () => void };

export default function AuthenticatedPage({ user, onLoggedOut }: AuthenticatedPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      if (await logoutUser()) {
        onLoggedOut();
      } else {
        setError('Something went wrong');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main>
      <h1>Money Lens</h1>
      <p>Logged in as {user.email}</p>
      <button type="button" onClick={handleLogout} disabled={pending}>
        Log out
      </button>
      {error && (
        <p role="alert" style={{ color: 'crimson' }}>
          {error}
        </p>
      )}
      <ImportPage />
    </main>
  );
}
