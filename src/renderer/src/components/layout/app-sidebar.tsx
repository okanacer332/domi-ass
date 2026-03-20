import { NavLink } from "react-router-dom";

import { appNavigation } from "../../app/navigation";
import { domizanLogoUrl } from "../../lib/assets";

export function AppSidebar() {
  return (
    <aside className="sidebar">
      <div className="brand-card">
        <img alt="Domizan logosu" className="brand-logo" src={domizanLogoUrl} />
      </div>

      <nav className="nav">
        {appNavigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`}
              to={item.to}
            >
              <span className="nav-item__icon">
                <Icon size={18} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
