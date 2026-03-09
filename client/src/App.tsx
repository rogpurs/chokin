import { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { fetchSetupStatus } from "./api/client";
import { useAuth } from "./contexts/AuthContext";
import BottomNav from "./components/ui/BottomNav";
import Sidebar from "./components/ui/Sidebar";
import SetupPage from "./pages/SetupPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import RecordPage from "./pages/RecordPage";
import HistoryPage from "./pages/HistoryPage";
import GoalsPage from "./pages/GoalsPage";
import GoalDetailPage from "./pages/GoalDetailPage";
import AccountsPage from "./pages/AccountsPage";
import CategoriesPage from "./pages/CategoriesPage";
import IncomeSourcesPage from "./pages/IncomeSourcesPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";

type BootState = "loading" | "setup" | "ready";

const AppLayout = (): JSX.Element => {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 pb-nav md:ml-60 md:pb-6">
        <div className="mx-auto max-w-lg px-4 pt-4 md:max-w-4xl md:px-6 md:pt-6">
          <Outlet />
        </div>
      </main>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
};

const App = (): JSX.Element => {
  const { user, token, isLoading } = useAuth();
  const [bootState, setBootState] = useState<BootState>("loading");

  const checkSetup = useCallback(async () => {
    try {
      const status = await fetchSetupStatus();
      setBootState(status.installed ? "ready" : "setup");
    } catch {
      setBootState("ready");
    }
  }, []);

  useEffect(() => {
    checkSetup();
  }, [checkSetup]);

  if (bootState === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)]">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-hero">
          <span className="text-3xl font-bold text-white">¥</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-primary animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (bootState === "setup") {
    return (
      <Routes>
        <Route path="/setup" element={<SetupPage onComplete={() => setBootState("ready")} />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  if (!token || !user) {
    return (
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (!user.onboarding_completed_at) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goals/:id" element={<GoalDetailPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/income-sources" element={<IncomeSourcesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
