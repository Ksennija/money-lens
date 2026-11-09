import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import PlaceholderPage from "./pages/PlaceholderPage";
import TransactionsPage from "./pages/TransactionsPage";
import { getCurrentUser, type CurrentUser } from "./api/session";
import AuthenticatedPage from "./pages/AuthenticatedPage";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import "./App.css";

type SessionState =
  | { status: "loading" }
  | { status: "logged-out" }
  | { status: "logged-in"; user: CurrentUser };

// Private pages that only have a title for now.
const PRIVATE_PLACEHOLDERS = [
  { path: "/insights", title: "Insights" },
  { path: "/history", title: "History" },
];

function toSessionState(user: CurrentUser | null): SessionState {
  return user ? { status: "logged-in", user } : { status: "logged-out" };
}

function App() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const navigate = useNavigate();

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
      <>
        <NavBar
          user={session.user}
          onLoggedOut={() => setSession({ status: "logged-out" })}
        />
        <Routes>
          <Route path="/" element={<PlaceholderPage title="Home" />} />
          <Route path="/signin" element={<Navigate to="/overview" replace />} />
          <Route path="/signup" element={<Navigate to="/overview" replace />} />
          <Route
            path="/overview"
            element={<AuthenticatedPage user={session.user} />}
          />
          <Route path="/transactions" element={<TransactionsPage />} />
          {PRIVATE_PLACEHOLDERS.map(({ path, title }) => (
            <Route
              key={path}
              path={path}
              element={<PlaceholderPage title={title} />}
            />
          ))}
          <Route path="*" element={<PlaceholderPage title="Error page" />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <NavBar user={null} />
      <Routes>
        <Route path="/" element={<PlaceholderPage title="Home" />} />
        <Route
          path="/signin"
          element={<LoginPage onLoggedIn={loadSession} />}
        />
        <Route
          path="/signup"
          element={
            <RegistrationPage onRegistered={() => navigate("/signin")} />
          }
        />
        <Route path="/overview" element={<Navigate to="/signin" replace />} />
        <Route path="/transactions" element={<Navigate to="/signin" replace />} />
        {PRIVATE_PLACEHOLDERS.map(({ path }) => (
          <Route
            key={path}
            path={path}
            element={<Navigate to="/signin" replace />}
          />
        ))}
        <Route path="*" element={<PlaceholderPage title="Error page" />} />
      </Routes>
    </>
  );
}

export default App;
