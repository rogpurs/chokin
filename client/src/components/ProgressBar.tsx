interface ProgressBarProps {
  value: number;
}

const ProgressBar = ({ value }: ProgressBarProps): JSX.Element => {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
};

export default ProgressBar;
