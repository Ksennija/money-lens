import { useState } from "react";
import { NavLink } from "react-router-dom";
import { logoutUser, type CurrentUser } from "../api/session";

type NavBarProps = { user: CurrentUser | null; onLoggedOut?: () => void };

const PRIVATE_LINKS = [
  { to: "/overview", label: "Overview" },
  { to: "/transactions", label: "Transactions" },
  { to: "/insights", label: "Insights" },
  { to: "/history", label: "History" },
];

// NavLink sets aria-current="page" on the link for the current URL.
export default function NavBar({ user, onLoggedOut }: NavBarProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      if (await logoutUser()) {
        onLoggedOut?.();
      } else {
        setError("Something went wrong");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <nav aria-label="Main">
      <NavLink to="/" end>
        Home
      </NavLink>
      {user ? (
        <>
          {PRIVATE_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
          <button type="button" onClick={handleLogout} disabled={pending}>
            Sign out
          </button>
          {error && (
            <p role="alert" style={{ color: "crimson" }}>
              {error}
            </p>
          )}
        </>
      ) : (
        <>
          <NavLink to="/signup">Sign up</NavLink>
          <NavLink to="/signin">Sign in</NavLink>
        </>
      )}
    </nav>
  );
}
