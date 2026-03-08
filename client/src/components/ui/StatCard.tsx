interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

const StatCard = ({ label, value, sub, trend, trendValue, className = "" }: StatCardProps): JSX.Element => {
  const trendColor =
    trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-muted";

  const trendIcon =
    trend === "up" ? "\u2191" : trend === "down" ? "\u2193" : "";

  return (
    <div className={`card ${className}`}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      {trend && trendValue && (
        <p className={`mt-1 text-xs font-medium ${trendColor}`}>
          {trendIcon} {trendValue}
        </p>
      )}
    </div>
  );
};

export default StatCard;
