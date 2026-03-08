export type TransactionType = "income" | "expense" | "transfer";

export interface SetupStatus {
  installed: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  salary_day: number;
  line_user_id: string | null;
  push_endpoint: string | null;
  push_p256dh: string | null;
  push_auth: string | null;
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface Account {
  id: number;
  user_id: number;
  name: string;
  type: string;
  balance: number;
}

export interface Goal {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  current_savings: number;
  deadline: string | null;
  progressRate: number;
}

export interface DashboardData {
  period: {
    label: string;
    startDate: string;
    endDate: string;
    daysUntilPayday: number;
    periodProgressRate: number;
  };
  totalAssets: number;
  accounts: Account[];
  goals: Goal[];
  totalGoalAmount: number;
  totalCurrentSavings: number;
  overallProgressRate: number;
}

export interface MonthlyReport {
  id: number;
  label: string;
  start_date: string;
  end_date: string;
  income_amount: number;
  expense_total: number;
  saving_total: number;
  balance_amount: number;
  comment: string | null;
  closed_at: string;
}
