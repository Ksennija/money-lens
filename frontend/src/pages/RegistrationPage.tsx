import { useState, type SubmitEvent } from 'react';
import { registerUser } from '../api/register';

export default function RegistrationPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const result = await registerUser(email, password);
    setMessage(result.message);
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
      <button type="submit">Register</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
