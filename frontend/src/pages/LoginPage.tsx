import { useState, type SubmitEvent } from 'react';
import { Link } from 'react-router-dom';
import { loginUser, type LoginResult } from '../api/login';
import styles from './LoginPage.module.scss';

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
    <main className={styles.page}>
      <Link to="/" className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">
          S
        </span>
        SpendWise
      </Link>
      <form className={styles.card} onSubmit={handleSubmit}>
        <Link
          to="/"
          className={styles.close}
          aria-label="Close and go back to the home page"
        >
          ×
        </Link>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>Welcome back. Sign in to see your money.</p>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className={styles.button} disabled={pending}>
          Sign in
        </button>
        {result && !result.ok && (
          <p role="alert" className={styles.error}>
            {result.message}
          </p>
        )}
        <p className={styles.switch}>
          New to SpendWise? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </main>
  );
}
