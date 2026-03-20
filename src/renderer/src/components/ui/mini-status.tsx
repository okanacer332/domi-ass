type MiniStatusProps = {
  label: string;
  ready: boolean;
};

export function MiniStatus({ label, ready }: MiniStatusProps) {
  return (
    <div className={`mini-status ${ready ? "ready" : "muted"}`}>
      <span>{label}</span>
      <strong>{ready ? "Hazır" : "Kapalı"}</strong>
    </div>
  );
}
