import { domizanMascotUrl } from "../../lib/assets";

export function MascotDock() {
  return (
    <div aria-hidden="true" className="mascot-dock">
      <div className="mascot-dock__glow" />
      <div className="mascot-dock__bubble">
        <img alt="" className="mascot-dock__image" src={domizanMascotUrl} />
      </div>
    </div>
  );
}
