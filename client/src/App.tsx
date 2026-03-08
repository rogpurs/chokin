import { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet, NavLink, useNavigate } from "react-router-dom";
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
    <div className="flex min-h-screen">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 pb-20 md:ml-60 md:pb-0">
        <div className="mx-auto max-w-4xl p-4 md:p-6">
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
      if (!status.installed) {
        setBootState("setup");
      } else {
        setBootState("ready");
      }
    } catch {
      setBootState("ready");
    }
  }, []);

  useEffect(() => {
    checkSetup();
  }, [checkSetup]);

  if (bootState === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted">読み込み中...</p>
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
