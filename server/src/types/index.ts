export type TransactionType = "income" | "expense" | "transfer";

export interface SetupState {
  installed: boolean;
  appName: string;
  appDescription: string;
  baseUrl: string;
  db: {
    sqlitePath: string;
  };
  jwtSecret: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  lineChannelAccessToken?: string;
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
}

export interface PeriodInfo {
  label: string;
  startDate: string;
  endDate: string;
  daysUntilPayday: number;
  periodProgressRate: number;
}
