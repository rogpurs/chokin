export type TransactionType = "income" | "expense" | "transfer" | "avoid";

export interface SetupState {
  installed: boolean;
  appName: string;
  appDescription: string;
  baseUrl: string;
  db: { sqlitePath: string };
  jwtSecret: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  lineChannelAccessToken?: string;
  lineLoginChannelId?: string;
  lineLoginChannelSecret?: string;
}

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
  push_endpoint: string | null;
  push_p256dh: string | null;
  push_auth: string | null;
}

export interface Account {
  id: number;
  user_id: number;
  name: string;
  type: string;
  balance: number;
  initial_balance: number;
  is_active: number;
  sort_order: number;
  include_in_total_assets: number;
  note: string | null;
}

export interface Goal {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  current_savings: number;
  deadline: string | null;
  monthly_target_amount: number | null;
  is_active: number;
}

export interface Category {
  id: number;
  user_id: number | null;
  kind: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_default: number;
  is_active: number;
}

export interface IncomeSource {
  id: number;
  user_id: number;
  name: string;
  kind: string;
  pay_day: number | null;
  default_amount: number | null;
  account_id: number | null;
  is_primary: number;
  is_active: number;
}

export interface Transaction {
  id: number;
  user_id: number;
  amount: number;
  type: TransactionType;
  category: string | null;
  category_id: number | null;
  from_account_id: number | null;
  to_account_id: number | null;
  date: string;
  note: string | null;
  deleted_at: string | null;
  quick_action_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface SavingRecord {
  id: number;
  user_id: number;
  goal_id: number;
  amount: number;
  record_date: string;
  note: string | null;
  source_account_id: number | null;
  created_at: string;
}

export interface PushSubscription {
  id: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  device_label: string | null;
  is_active: number;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
}

export interface QuickAction {
  id: number;
  user_id: number;
  kind: string;
  label: string;
  amount: number | null;
  category_id: number | null;
  account_id: number | null;
  sort_order: number;
  is_active: number;
}

export interface PeriodInfo {
  label: string;
  startDate: string;
  endDate: string;
  daysUntilPayday: number;
  periodProgressRate: number;
}

export interface MonthlyReport {
  id: number;
  user_id: number;
  period_id: number;
  income_amount: number;
  expense_total: number;
  saving_total: number;
  balance_amount: number;
  comment: string | null;
  closed_at: string;
}
