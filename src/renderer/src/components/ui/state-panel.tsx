type StatePanelProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function StatePanel({ eyebrow, title, description }: StatePanelProps) {
  return (
    <section className="page-stack">
      <article className="panel state-panel">
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <p>{description}</p>
      </article>
    </section>
  );
}
