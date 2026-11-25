import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { Link, NavLink } from "react-router-dom";
import { logoutUser, type CurrentUser } from "../../api/session";
import styles from "./NavBar.module.scss";

type NavBarProps = { user: CurrentUser | null; onLoggedOut?: () => void };

const PRIVATE_LINKS = [
  { to: "/overview", label: "Overview" },
  { to: "/transactions", label: "Transactions" },
  { to: "/insights", label: "Insights" },
];

function cx(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(" ");
}

// NavLink sets aria-current="page" on the link for the current URL, and
// passes isActive to className so the active link can be styled.
export default function NavBar({ user, onLoggedOut }: NavBarProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Mobile menu: close on Escape (focus returns to the button) and on a
  // click outside the header.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuRef.current?.focus();
      }
    }
    function onClick(event: globalThis.MouseEvent) {
      if (!barRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  // Close the menu after a link is chosen.
  function handlePanelClick(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a")) setOpen(false);
  }

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      if (await logoutUser()) {
        setOpen(false);
        onLoggedOut?.();
      } else {
        setError("Something went wrong");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <header className={styles.wrap}>
      <div ref={barRef} className={cx(styles.top, open && styles.open)}>
        <Link to="/" className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            S
          </span>
          SpendWise
        </Link>
        <button
          ref={menuRef}
          type="button"
          className={styles.menu}
          aria-label="Toggle navigation"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((isOpen) => !isOpen)}
        >
          {open ? "×" : "☰"}
        </button>
        <nav
          id={panelId}
          aria-label="Main"
          className={styles.panel}
          onClick={handlePanelClick}
        >
          {user ? (
            <>
              <div className={styles.links}>
                {PRIVATE_LINKS.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cx(styles.link, isActive && styles.active)
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.action}
                  onClick={handleLogout}
                  disabled={pending}
                >
                  Sign out
                </button>
                {error && (
                  <p role="alert" className={styles.error}>
                    {error}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className={styles.actions}>
              <NavLink
                to="/signin"
                className={({ isActive }) =>
                  cx(styles.action, isActive && styles.active)
                }
              >
                Sign in
              </NavLink>
              <NavLink
                to="/signup"
                className={({ isActive }) =>
                  cx(styles.action, styles.primary, isActive && styles.active)
                }
              >
                Sign up
              </NavLink>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
