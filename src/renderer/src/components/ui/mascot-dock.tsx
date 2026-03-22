import { domizanMascotUrl } from "../../lib/assets";

type MascotDockProps = {
  isActive?: boolean;
  onClick?: () => void;
};

export function MascotDock({ isActive = false, onClick }: MascotDockProps) {
  return (
    <div className={`mascot-dock ${isActive ? "is-active" : ""}`}>
      <div className="mascot-dock__glow" />
      <button
        aria-label="Domizan agent sohbetini ac"
        className="mascot-dock__bubble"
        onClick={onClick}
        type="button"
      >
        <img alt="" className="mascot-dock__image" src={domizanMascotUrl} />
      </button>
    </div>
  );
}
