type StatusPillProps = {
  label: string;
  ready: boolean;
};

export function StatusPill({ label, ready }: StatusPillProps) {
  return (
    <div className={`status-pill ${ready ? "ready" : "muted"}`}>
      <span className="status-dot" />
      <span>{label}</span>
    </div>
  );
}
