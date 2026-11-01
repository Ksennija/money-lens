import { useState, type SubmitEvent } from 'react';
import { registerUser, type RegisterResult } from '../api/register';

type RegistrationPageProps = { onRegistered?: () => void };

export default function RegistrationPage({ onRegistered }: RegistrationPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setResult(null);
    try {
      const registerResult = await registerUser(email, password);
      setResult(registerResult);
      if (registerResult.ok) onRegistered?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Sign up</h1>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <button type="submit" disabled={pending}>
        Sign up
      </button>
      {result?.ok && <p role="status">{result.message}</p>}
      {result && !result.ok && (
        <p role="alert" style={{ color: 'crimson' }}>
          {result.message}
        </p>
      )}
    </form>
  );
}
