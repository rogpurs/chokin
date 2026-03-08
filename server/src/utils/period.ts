import type { PeriodInfo } from "../types";

const toYmd = (d: Date): string => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const dayStart = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const diffDays = (a: Date, b: Date): number => Math.floor((dayStart(b).getTime() - dayStart(a).getTime()) / 86400000);

export const getCurrentPeriodInfo = (salaryDay: number, now: Date = new Date()): PeriodInfo => {
  const cur = dayStart(now);
  const start = cur.getDate() >= salaryDay
    ? new Date(cur.getFullYear(), cur.getMonth(), salaryDay)
    : new Date(cur.getFullYear(), cur.getMonth() - 1, salaryDay);
  const nextStart = new Date(start.getFullYear(), start.getMonth() + 1, salaryDay);
  const end = new Date(nextStart.getFullYear(), nextStart.getMonth(), salaryDay - 1);
  const nextPayday = cur.getDate() >= salaryDay
    ? new Date(cur.getFullYear(), cur.getMonth() + 1, salaryDay)
    : new Date(cur.getFullYear(), cur.getMonth(), salaryDay);

  const total = diffDays(start, end) + 1;
  const elapsed = diffDays(start, cur) + 1;

  return {
    label: `${end.getFullYear()}年${end.getMonth() + 1}月期`,
    startDate: toYmd(start),
    endDate: toYmd(end),
    daysUntilPayday: Math.max(0, diffDays(cur, nextPayday)),
    periodProgressRate: Math.min(100, Number(((elapsed / total) * 100).toFixed(1)))
  };
};
