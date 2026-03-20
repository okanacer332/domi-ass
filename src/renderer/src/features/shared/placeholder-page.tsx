import { StatePanel } from "../../components/ui/state-panel";

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <StatePanel
      eyebrow="Yakında"
      title={title}
      description="Bu alan bir sonraki adımda gerçek veri akışı ile doldurulacak."
    />
  );
}
