import { useEffect, useState, type ReactNode } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import NavBar from "./components/NavBar/NavBar";
import InsightsPage from "./pages/InsightsPage";
import LandingPage from "./pages/LandingPage";
import OverviewPage from "./pages/OverviewPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import TransactionsPage from "./pages/TransactionsPage";
import { getCurrentUser, type CurrentUser } from "./api/session";
import AuthenticatedLayout from "./components/AuthenticatedLayout/AuthenticatedLayout";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";

type SessionState =
  | { status: "loading" }
  | { status: "logged-out" }
  | { status: "logged-in"; user: CurrentUser };

function toSessionState(user: CurrentUser | null): SessionState {
  return user ? { status: "logged-in", user } : { status: "logged-out" };
}

function App() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const navigate = useNavigate();
  const { pathname } = useLocation();

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
    const user = session.user;
    // Every signed-in page shares one layout: the main landmark and "Logged in as …".
    const signedIn = (page: ReactNode) => (
      <AuthenticatedLayout user={user}>{page}</AuthenticatedLayout>
    );
    return (
      <>
        <NavBar
          user={session.user}
          onLoggedOut={() => setSession({ status: "logged-out" })}
        />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<Navigate to="/overview" replace />} />
          <Route path="/signup" element={<Navigate to="/overview" replace />} />
          <Route
            path="/overview"
            element={signedIn(<OverviewPage />)}
          />
          <Route path="/transactions" element={signedIn(<TransactionsPage />)} />
          <Route path="/insights" element={signedIn(<InsightsPage />)} />
          <Route path="*" element={<PlaceholderPage title="Error page" />} />
        </Routes>
      </>
    );
  }

  // The sign in and sign up pages are standalone cards with their own logo.
  const isAuthPage = pathname === "/signin" || pathname === "/signup";

  return (
    <>
      {!isAuthPage && <NavBar user={null} />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
        <Route path="/insights" element={<Navigate to="/signin" replace />} />
        <Route path="*" element={<PlaceholderPage title="Error page" />} />
      </Routes>
    </>
  );
}

export default App;
