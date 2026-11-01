import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import PlaceholderPage from "./pages/PlaceholderPage";
import { getCurrentUser, type CurrentUser } from "./api/session";
import AuthenticatedPage from "./pages/AuthenticatedPage";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import "./App.css";

type SessionState =
  | { status: "loading" }
  | { status: "logged-out" }
  | { status: "logged-in"; user: CurrentUser };

const PRIVATE_PLACEHOLDERS = [
  { path: "/transactions", title: "Transactions" },
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
      <Routes>
        <Route path="/" element={<PlaceholderPage title="Home" />} />
        <Route path="/signin" element={<Navigate to="/overview" replace />} />
        <Route path="/signup" element={<Navigate to="/overview" replace />} />
        <Route
          path="/overview"
          element={
            <AuthenticatedPage
              user={session.user}
              onLoggedOut={() => setSession({ status: "logged-out" })}
            />
          }
        />
        {PRIVATE_PLACEHOLDERS.map(({ path, title }) => (
          <Route key={path} path={path} element={<PlaceholderPage title={title} />} />
        ))}
        <Route path="*" element={<PlaceholderPage title="Error page" />} />
      </Routes>
    );
  }

  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<PlaceholderPage title="Home" />} />
        <Route path="/signin" element={<LoginPage onLoggedIn={loadSession} />} />
        <Route
          path="/signup"
          element={<RegistrationPage onRegistered={() => navigate("/signin")} />}
        />
        <Route path="/overview" element={<Navigate to="/signin" replace />} />
        {PRIVATE_PLACEHOLDERS.map(({ path }) => (
          <Route key={path} path={path} element={<Navigate to="/signin" replace />} />
        ))}
        <Route path="*" element={<PlaceholderPage title="Error page" />} />
      </Routes>
    </>
  );
}

export default App;
