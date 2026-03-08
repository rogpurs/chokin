import type { AuthResult, DashboardData, MonthlyReport, SetupStatus, TransactionType, Transaction, Account, Goal, Category, IncomeSource, QuickAction, PushSub, SavingRecord, TransactionListResult, User } from "../types";

let token = sessionStorage.getItem("auth_token") ?? "";

export const setToken = (v: string) => { token = v; sessionStorage.setItem("auth_token", v); };
export const clearToken = () => { token = ""; sessionStorage.removeItem("auth_token"); };
export const getToken = () => token;

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string> | undefined) } });
  if (res.status === 401) { clearToken(); throw new Error("SESSION_EXPIRED"); }
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "APIエラー");
  return body as T;
};

// Setup
export const fetchSetupStatus = () => request<SetupStatus>("/api/setup/status");
export const runSetup = (p: { appName: string; appDescription: string; baseUrl: string; sqlitePath?: string; adminUsername: string; adminEmail: string; adminPassword: string; salaryDay: number; lineChannelAccessToken?: string }) =>
  request<{ message: string }>("/api/setup", { method: "POST", body: JSON.stringify(p) });

// Auth
export const register = (p: { username: string; email: string; password: string; salaryDay: number }) =>
  request<{ message: string }>("/api/auth/register", { method: "POST", body: JSON.stringify(p) });
export const login = (p: { email: string; password: string }) =>
  request<AuthResult>("/api/auth/login", { method: "POST", body: JSON.stringify(p) });

// Dashboard
export const fetchDashboard = () => request<DashboardData>("/api/dashboard");

// Transactions
export const fetchTransactions = (params?: Record<string, string>) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<TransactionListResult>(`/api/transactions${qs}`);
};
export const createTransaction = (p: { amount: number; type: TransactionType; category_id?: number | null; from_account_id?: number | null; to_account_id?: number | null; date: string; note?: string }) =>
  request<{ message: string }>("/api/transactions", { method: "POST", body: JSON.stringify(p) });
export const updateTransaction = (id: number, p: Record<string, unknown>) =>
  request<{ message: string }>(`/api/transactions/${id}`, { method: "PUT", body: JSON.stringify(p) });
export const deleteTransaction = (id: number) =>
  request<{ message: string }>(`/api/transactions/${id}`, { method: "DELETE" });

// Accounts
export const fetchAccounts = () => request<Account[]>("/api/accounts");
export const createAccount = (p: { name: string; type: string; balance: number }) =>
  request<{ id: number }>("/api/accounts", { method: "POST", body: JSON.stringify(p) });
export const updateAccount = (id: number, p: Record<string, unknown>) =>
  request<{ message: string }>(`/api/accounts/${id}`, { method: "PUT", body: JSON.stringify(p) });
export const deleteAccount = (id: number) =>
  request<{ message: string }>(`/api/accounts/${id}`, { method: "DELETE" });

// Goals
export const fetchGoals = () => request<Goal[]>("/api/goals");
export const createGoal = (p: { name: string; target_amount: number; deadline?: string; current_savings?: number }) =>
  request<{ id: number }>("/api/goals", { method: "POST", body: JSON.stringify(p) });
export const updateGoal = (id: number, p: Record<string, unknown>) =>
  request<{ message: string }>(`/api/goals/${id}`, { method: "PUT", body: JSON.stringify(p) });
export const deleteGoal = (id: number) =>
  request<{ message: string }>(`/api/goals/${id}`, { method: "DELETE" });
export const addGoalSaving = (goalId: number, p: { amount: number; record_date: string; note?: string; source_account_id?: number }) =>
  request<{ message: string }>(`/api/goals/${goalId}/savings`, { method: "POST", body: JSON.stringify(p) });
export const fetchGoalSavings = (goalId: number) =>
  request<SavingRecord[]>(`/api/goals/${goalId}/savings`);

// Reports
export const fetchReports = () => request<MonthlyReport[]>("/api/reports");
export const closePeriod = (comment: string) =>
  request<{ message: string }>("/api/periods/close", { method: "POST", body: JSON.stringify({ comment }) });

// Categories
export const fetchCategories = () => request<Category[]>("/api/categories");
export const createCategory = (p: { name: string; kind: string }) =>
  request<{ id: number }>("/api/categories", { method: "POST", body: JSON.stringify(p) });
export const updateCategory = (id: number, p: Record<string, unknown>) =>
  request<{ message: string }>(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(p) });
export const deleteCategory = (id: number) =>
  request<{ message: string }>(`/api/categories/${id}`, { method: "DELETE" });

// Income Sources
export const fetchIncomeSources = () => request<IncomeSource[]>("/api/income-sources");
export const createIncomeSource = (p: { name: string; kind: string; pay_day?: number; default_amount?: number; account_id?: number; is_primary?: boolean }) =>
  request<{ id: number }>("/api/income-sources", { method: "POST", body: JSON.stringify(p) });
export const updateIncomeSource = (id: number, p: Record<string, unknown>) =>
  request<{ message: string }>(`/api/income-sources/${id}`, { method: "PUT", body: JSON.stringify(p) });
export const deleteIncomeSource = (id: number) =>
  request<{ message: string }>(`/api/income-sources/${id}`, { method: "DELETE" });

// Quick Actions
export const fetchQuickActions = () => request<QuickAction[]>("/api/quick-actions");
export const createQuickAction = (p: { kind: string; label: string; amount?: number; category_id?: number; account_id?: number }) =>
  request<{ id: number }>("/api/quick-actions", { method: "POST", body: JSON.stringify(p) });

// User
export const fetchProfile = () => request<User>("/api/user/profile");
export const updateProfile = (p: Record<string, unknown>) =>
  request<{ message: string }>("/api/user/profile", { method: "PUT", body: JSON.stringify(p) });
export const updatePassword = (p: { current_password: string; new_password: string }) =>
  request<{ message: string }>("/api/user/password", { method: "PUT", body: JSON.stringify(p) });

// Push
export const fetchPushPublicKey = () => request<{ publicKey: string }>("/api/push/public-key");
export const subscribePush = (sub: PushSubscriptionJSON & { device_label?: string }) =>
  request<{ message: string }>("/api/push/subscribe", { method: "POST", body: JSON.stringify(sub) });
export const sendPushTest = () => request<{ message: string; successCount?: number }>("/api/push/test", { method: "POST" });
export const fetchPushSubscriptions = () => request<PushSub[]>("/api/push/subscriptions");

// LINE
export const linkLine = (lineUserId: string) =>
  request<{ message: string }>("/api/line/link", { method: "POST", body: JSON.stringify({ lineUserId }) });
export const sendLineTest = () => request<{ message: string }>("/api/line/test", { method: "POST" });
export const getLineAuthUrl = () => request<{ url: string; state: string }>("/api/line/auth-url");

// Onboarding
export const completeOnboarding = (p: {
  salaryDay: number;
  accounts: { name: string; type: string; balance: number }[];
  goals?: { name: string; target_amount: number; deadline?: string; current_savings?: number }[];
  incomeSource?: { name: string; kind: string; pay_day?: number; default_amount?: number; account_index?: number };
}) => request<{ message: string }>("/api/onboarding/complete", { method: "POST", body: JSON.stringify(p) });
