import { useEffect, useState } from "react";
import { getCurrentUser, type CurrentUser } from "./api/session";
import AuthenticatedPage from "./pages/AuthenticatedPage";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import "./App.css";

type SessionState = { status: "loading" } | { status: "logged-out" } | { status: "logged-in"; user: CurrentUser };

function toSessionState(user: CurrentUser | null): SessionState {
  return user ? { status: "logged-in", user } : { status: "logged-out" };
}

function App() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((user) => {
      if (!cancelled) setSession(toSessionState(user));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadSession() {
    setSession(toSessionState(await getCurrentUser()));
  }

  if (session.status === "loading") {
    return <p role="status">Loading…</p>;
  }

  if (session.status === "logged-in") {
    return (
      <AuthenticatedPage user={session.user} onLoggedOut={() => setSession({ status: "logged-out" })} />
    );
  }

  return (
    <>
      <LoginPage onLoggedIn={loadSession} />
      <RegistrationPage />
    </>
  );
}

export default App;
