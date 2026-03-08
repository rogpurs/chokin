import type { AuthResult, DashboardData, MonthlyReport, SetupStatus, TransactionType } from "../types";

interface SetupPayload {
  appName: string;
  appDescription: string;
  baseUrl: string;
  sqlitePath?: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
  salaryDay: number;
  lineChannelAccessToken?: string;
}

interface TransactionPayload {
  amount: number;
  type: TransactionType;
  category?: string;
  from_account_id?: number | null;
  to_account_id?: number | null;
  date: string;
  note?: string;
}

let token = sessionStorage.getItem("auth_token") ?? "";

export const setToken = (value: string): void => {
  token = value;
  sessionStorage.setItem("auth_token", value);
};

export const clearToken = (): void => {
  token = "";
  sessionStorage.removeItem("auth_token");
};

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string> | undefined) }
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? "APIエラー");
  }
  return body as T;
};

export const fetchSetupStatus = (): Promise<SetupStatus> => request<SetupStatus>("/api/setup/status");
export const runSetup = (payload: SetupPayload): Promise<{ message: string }> =>
  request<{ message: string }>("/api/setup", { method: "POST", body: JSON.stringify(payload) });

export const register = (payload: { username: string; email: string; password: string; salaryDay: number }): Promise<{ message: string }> =>
  request<{ message: string }>("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });

export const login = (payload: { email: string; password: string }): Promise<AuthResult> =>
  request<AuthResult>("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });

export const fetchDashboard = (): Promise<DashboardData> => request<DashboardData>("/api/dashboard");
export const fetchReports = (): Promise<MonthlyReport[]> => request<MonthlyReport[]>("/api/reports");

export const closePeriod = (comment: string): Promise<{ message: string }> =>
  request<{ message: string }>("/api/periods/close", { method: "POST", body: JSON.stringify({ comment }) });

export const createTransaction = (payload: TransactionPayload): Promise<{ message: string }> =>
  request<{ message: string }>("/api/transactions", { method: "POST", body: JSON.stringify(payload) });

export const addGoalSaving = (goalId: number, payload: { amount: number; record_date: string; note?: string }): Promise<{ message: string }> =>
  request<{ message: string }>(`/api/goals/${goalId}/savings`, { method: "POST", body: JSON.stringify(payload) });

export const fetchPushPublicKey = (): Promise<{ publicKey: string }> => request<{ publicKey: string }>("/api/push/public-key");
export const subscribePush = (subscription: PushSubscriptionJSON): Promise<{ message: string }> =>
  request<{ message: string }>("/api/push/subscribe", { method: "POST", body: JSON.stringify(subscription) });
export const sendPushTest = (): Promise<{ message: string }> => request<{ message: string }>("/api/push/test", { method: "POST" });

export const linkLine = (lineUserId: string): Promise<{ message: string }> =>
  request<{ message: string }>("/api/line/link", { method: "POST", body: JSON.stringify({ lineUserId }) });
export const sendLineTest = (): Promise<{ message: string }> => request<{ message: string }>("/api/line/test", { method: "POST" });
