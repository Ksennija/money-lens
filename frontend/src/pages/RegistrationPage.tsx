import { useState, type SubmitEvent } from 'react';
import { registerUser, type RegisterResult } from '../api/register';

export default function RegistrationPage() {
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
      setResult(await registerUser(email, password));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Register</h1>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <button type="submit" disabled={pending}>
        Register
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
