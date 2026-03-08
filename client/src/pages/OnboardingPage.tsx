import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeOnboarding } from "../api/client";
import { useAuth } from "../contexts/AuthContext";

interface AccountInput {
  name: string;
  type: string;
  balance: number;
}

interface IncomeSourceInput {
  name: string;
  kind: string;
  pay_day: number;
  default_amount: number;
  account_index: number;
}

interface GoalInput {
  name: string;
  target_amount: number;
  deadline: string;
}

const ACCOUNT_TYPES = ["現金", "普通預金", "貯蓄用", "クレジットカード"];
const INCOME_KINDS = ["給与", "副業", "投資", "年金", "その他"];

const OnboardingPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [salaryDay, setSalaryDay] = useState(25);
  const [accounts, setAccounts] = useState<AccountInput[]>([
    { name: "財布", type: "現金", balance: 0 },
  ]);
  const [incomeSource, setIncomeSource] = useState<IncomeSourceInput>({
    name: "給与",
    kind: "給与",
    pay_day: 25,
    default_amount: 0,
    account_index: 0,
  });
  const [skipIncome, setSkipIncome] = useState(false);
  const [goal, setGoal] = useState<GoalInput>({
    name: "",
    target_amount: 0,
    deadline: "",
  });
  const [skipGoal, setSkipGoal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const totalSteps = 5;

  const addAccount = () => {
    setAccounts((prev) => [...prev, { name: "", type: "普通預金", balance: 0 }]);
  };

  const updateAccount = (index: number, field: keyof AccountInput, value: string | number) => {
    setAccounts((prev) =>
      prev.map((acc, i) => (i === index ? { ...acc, [field]: value } : acc))
    );
  };

  const removeAccount = (index: number) => {
    if (accounts.length <= 1) return;
    setAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const canProceed = (): boolean => {
    if (step === 0) return salaryDay >= 1 && salaryDay <= 31;
    if (step === 1) return accounts.length > 0 && accounts.every((a) => a.name.trim() !== "");
    if (step === 2) return skipIncome || (incomeSource.name.trim() !== "" && incomeSource.default_amount > 0);
    if (step === 3) return skipGoal || (goal.name.trim() !== "" && goal.target_amount > 0);
    return true;
  };

  const handleComplete = async () => {
    setError("");
    setLoading(true);
    try {
      const payload: Parameters<typeof completeOnboarding>[0] = {
        salaryDay,
        accounts,
      };
      if (!skipIncome) {
        payload.incomeSource = {
          name: incomeSource.name,
          kind: incomeSource.kind,
          pay_day: incomeSource.pay_day,
          default_amount: incomeSource.default_amount,
          account_index: incomeSource.account_index,
        };
      }
      if (!skipGoal && goal.name.trim()) {
        payload.goals = [
          {
            name: goal.name,
            target_amount: goal.target_amount,
            deadline: goal.deadline || undefined,
          },
        ];
      }
      await completeOnboarding(payload);
      await refreshUser();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "オンボーディングに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (step < totalSteps - 1) setStep(step + 1);
  };
  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">CHOKIN</h1>
          <p className="mt-1 text-sm text-muted">初期設定</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6 flex gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        <div className="card">
          {/* Step 0: Welcome + Salary Day */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="section-title">ようこそ!</h2>
              <p className="text-sm text-muted">
                まずは給料日を設定しましょう。家計管理の期間を給料日ベースで管理します。
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium">給料日（毎月）</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={salaryDay}
                  onChange={(e) => setSalaryDay(Number(e.target.value))}
                  className="input-field"
                />
              </div>
              <p className="text-xs text-muted">後から変更できます</p>
            </div>
          )}

          {/* Step 1: Add Accounts */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="section-title">口座を登録</h2>
              <p className="text-sm text-muted">
                お金を管理する口座を最低1つ追加してください。
              </p>
              <div className="space-y-3">
                {accounts.map((acc, i) => (
                  <div key={i} className="rounded-xl border border-[var(--color-border)] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted">口座 {i + 1}</span>
                      {accounts.length > 1 && (
                        <button
                          onClick={() => removeAccount(i)}
                          className="text-xs text-danger hover:underline"
                        >
                          削除
                        </button>
                      )}
                    </div>
                    <input
                      placeholder="口座名（例: 財布）"
                      value={acc.name}
                      onChange={(e) => updateAccount(i, "name", e.target.value)}
                      className="input-field"
                    />
                    <select
                      value={acc.type}
                      onChange={(e) => updateAccount(i, "type", e.target.value)}
                      className="input-field"
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <div>
                      <label className="mb-1 block text-xs text-muted">初期残高</label>
                      <input
                        type="number"
                        value={acc.balance}
                        onChange={(e) => updateAccount(i, "balance", Number(e.target.value))}
                        className="input-field"
                        min={0}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addAccount} className="btn-secondary w-full">
                + 口座を追加
              </button>
              <p className="text-xs text-muted">後から変更できます</p>
            </div>
          )}

          {/* Step 2: Income Source */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="section-title">収入源を登録</h2>
              <p className="text-sm text-muted">主な収入源を登録してください。</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={skipIncome}
                  onChange={(e) => setSkipIncome(e.target.checked)}
                  className="rounded"
                />
                スキップする
              </label>
              {!skipIncome && (
                <div className="space-y-3">
                  <input
                    placeholder="収入源名（例: 給与）"
                    value={incomeSource.name}
                    onChange={(e) =>
                      setIncomeSource((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="input-field"
                  />
                  <select
                    value={incomeSource.kind}
                    onChange={(e) =>
                      setIncomeSource((prev) => ({ ...prev, kind: e.target.value }))
                    }
                    className="input-field"
                  >
                    {INCOME_KINDS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  <div>
                    <label className="mb-1 block text-xs text-muted">支給日</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={incomeSource.pay_day}
                      onChange={(e) =>
                        setIncomeSource((prev) => ({
                          ...prev,
                          pay_day: Number(e.target.value),
                        }))
                      }
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">推定金額</label>
                    <input
                      type="number"
                      min={0}
                      value={incomeSource.default_amount}
                      onChange={(e) =>
                        setIncomeSource((prev) => ({
                          ...prev,
                          default_amount: Number(e.target.value),
                        }))
                      }
                      className="input-field"
                    />
                  </div>
                  {accounts.length > 1 && (
                    <div>
                      <label className="mb-1 block text-xs text-muted">入金先口座</label>
                      <select
                        value={incomeSource.account_index}
                        onChange={(e) =>
                          setIncomeSource((prev) => ({
                            ...prev,
                            account_index: Number(e.target.value),
                          }))
                        }
                        className="input-field"
                      >
                        {accounts.map((acc, i) => (
                          <option key={i} value={i}>
                            {acc.name || `口座 ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted">後から変更できます</p>
            </div>
          )}

          {/* Step 3: Goal */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="section-title">貯金目標を設定</h2>
              <p className="text-sm text-muted">貯金のモチベーションになる目標を設定しましょう。</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={skipGoal}
                  onChange={(e) => setSkipGoal(e.target.checked)}
                  className="rounded"
                />
                スキップする
              </label>
              {!skipGoal && (
                <div className="space-y-3">
                  <input
                    placeholder="目標名（例: 旅行資金）"
                    value={goal.name}
                    onChange={(e) => setGoal((prev) => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                  />
                  <div>
                    <label className="mb-1 block text-xs text-muted">目標金額</label>
                    <input
                      type="number"
                      min={0}
                      value={goal.target_amount}
                      onChange={(e) =>
                        setGoal((prev) => ({
                          ...prev,
                          target_amount: Number(e.target.value),
                        }))
                      }
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">期限（任意）</label>
                    <input
                      type="date"
                      value={goal.deadline}
                      onChange={(e) =>
                        setGoal((prev) => ({ ...prev, deadline: e.target.value }))
                      }
                      className="input-field"
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-muted">後から変更できます</p>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="section-title">設定内容の確認</h2>
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs font-medium text-muted">給料日</p>
                  <p className="font-semibold">毎月 {salaryDay} 日</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs font-medium text-muted">口座</p>
                  {accounts.map((acc, i) => (
                    <p key={i} className="font-semibold">
                      {acc.name} ({acc.type}) - {acc.balance.toLocaleString()}円
                    </p>
                  ))}
                </div>
                {!skipIncome && (
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-xs font-medium text-muted">収入源</p>
                    <p className="font-semibold">
                      {incomeSource.name} ({incomeSource.kind}) -{" "}
                      {incomeSource.default_amount.toLocaleString()}円/月
                    </p>
                  </div>
                )}
                {!skipGoal && goal.name && (
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-xs font-medium text-muted">貯金目標</p>
                    <p className="font-semibold">
                      {goal.name} - {goal.target_amount.toLocaleString()}円
                    </p>
                    {goal.deadline && (
                      <p className="text-xs text-muted">期限: {goal.deadline}</p>
                    )}
                  </div>
                )}
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <button onClick={prev} className="btn-secondary flex-1">
                戻る
              </button>
            )}
            {step < totalSteps - 1 ? (
              <button
                onClick={next}
                disabled={!canProceed()}
                className="btn-primary flex-1"
              >
                次へ
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? "設定中..." : "はじめる"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
