import { useState, type SubmitEvent } from 'react';
import { loginUser, type LoginResult } from '../api/login';

type LoginPageProps = { onLoggedIn: () => void };

export default function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<LoginResult | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setResult(null);
    try {
      const loginResult = await loginUser(email, password);
      if (loginResult.ok) {
        onLoggedIn();
      } else {
        setResult(loginResult);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Log in</h1>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <button type="submit" disabled={pending}>
        Log in
      </button>
      {result && !result.ok && (
        <p role="alert" style={{ color: 'crimson' }}>
          {result.message}
        </p>
      )}
    </form>
  );
}
