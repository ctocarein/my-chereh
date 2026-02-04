type ProgressBarProps = {
  progress: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export default function ProgressBar({
  progress,
  height = 4,
  color = "var(--brand)",
  backgroundColor = "var(--surface-alt)",
}: ProgressBarProps) {
  const normalized = clamp(progress);

  return (
    <div
      className="progress-bar"
      style={{ height: `${height}px`, backgroundColor }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(normalized * 100)}
    >
      <div
        className="progress-bar__fill"
        style={{ width: `${normalized * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}
