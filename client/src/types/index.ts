export type TransactionType = "income" | "expense" | "transfer" | "avoid";

export interface SetupStatus { installed: boolean; }

export interface User {
  id: number;
  username: string;
  email: string;
  salary_day: number;
  display_name: string | null;
  line_user_id: string | null;
  onboarding_completed_at: string | null;
  budgeting_anchor_type: string;
  budgeting_anchor_day: number | null;
  period_start_rule: string;
  theme: string;
  reduce_motion: number;
  notification_level: string;
}

export interface AuthResult { token: string; user: User; }

export interface Account {
  id: number; user_id: number; name: string; type: string; balance: number;
  initial_balance: number; is_active: number; sort_order: number;
  include_in_total_assets: number; note: string | null;
}

export interface Goal {
  id: number; user_id: number; name: string; target_amount: number;
  current_savings: number; deadline: string | null;
  monthly_target_amount: number | null; is_active: number; progressRate?: number;
}

export interface Category {
  id: number; user_id: number | null; kind: string; name: string;
  icon: string | null; color: string | null; sort_order: number;
  is_default: number; is_active: number;
}

export interface IncomeSource {
  id: number; user_id: number; name: string; kind: string;
  pay_day: number | null; default_amount: number | null;
  account_id: number | null; is_primary: number; is_active: number;
}

export interface Transaction {
  id: number; user_id: number; amount: number; type: TransactionType;
  category: string | null; category_id: number | null;
  category_name?: string | null;
  from_account_id: number | null; to_account_id: number | null;
  from_account_name?: string | null; to_account_name?: string | null;
  date: string; note: string | null;
  deleted_at: string | null; quick_action_id: number | null;
  created_at: string; updated_at: string;
}

export interface SavingRecord {
  id: number; user_id: number; goal_id: number; amount: number;
  record_date: string; note: string | null;
  source_account_id: number | null; source_account_name?: string | null;
  created_at: string;
}

export interface QuickAction {
  id: number; user_id: number; kind: string; label: string;
  amount: number | null; category_id: number | null;
  account_id: number | null; category_name?: string; account_name?: string;
  sort_order: number; is_active: number;
}

export interface PushSub {
  id: number; endpoint: string; device_label: string | null;
  is_active: number; last_success_at: string | null;
}

export interface PeriodInfo {
  label: string; startDate: string; endDate: string;
  daysUntilPayday: number; periodProgressRate: number;
}

export interface PeriodSummary {
  income: number; expense: number; saving: number;
  avoid: number; balance: number;
}

export interface CategoryBreakdown { category_name: string; total: number; }

export interface DashboardData {
  period: PeriodInfo;
  totalAssets: number;
  accounts: Account[];
  goals: (Goal & { progressRate: number })[];
  totalGoalAmount: number;
  totalCurrentSavings: number;
  overallProgressRate: number;
  periodSummary: PeriodSummary;
  categoryBreakdown: CategoryBreakdown[];
  recentTransactions: Transaction[];
  previousPeriod: { income: number; expense: number };
}

export interface MonthlyReport {
  id: number; label: string; start_date: string; end_date: string;
  income_amount: number; expense_total: number; saving_total: number;
  balance_amount: number; comment: string | null; closed_at: string;
}

export interface TransactionListResult {
  items: Transaction[]; total: number; page: number; limit: number;
}
