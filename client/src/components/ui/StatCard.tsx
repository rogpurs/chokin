interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  accent?: "primary" | "success" | "danger" | "warn" | "accent";
}

const accentMap = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  success: { bg: "bg-success/10", text: "text-success" },
  danger: { bg: "bg-danger/10", text: "text-danger" },
  warn: { bg: "bg-warn/10", text: "text-warn" },
  accent: { bg: "bg-accent/10", text: "text-accent" },
};

const StatCard = ({ label, value, sub, trend, trendValue, className = "", accent }: StatCardProps): JSX.Element => {
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-[var(--color-text-secondary)]";
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "";
  const colors = accent ? accentMap[accent] : null;

  return (
    <div className={`card ${className}`}>
      <p className="label-sm truncate">{label}</p>
      <p className={`mt-1.5 text-[22px] font-bold amount-display leading-none ${colors ? colors.text : ""}`}>
        {value}
      </p>
      {sub && <p className="mt-1 label-sm">{sub}</p>}
      {trend && trendValue && (
        <p className={`mt-1.5 text-[12px] font-medium ${trendColor}`}>
          {trendIcon} {trendValue}
        </p>
      )}
    </div>
  );
};

export default StatCard;
