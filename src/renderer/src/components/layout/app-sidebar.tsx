import { NavLink } from "react-router-dom";

import { appNavigation } from "../../app/navigation";
import { domizanLogoUrl } from "../../lib/assets";

type AppSidebarProps = {
  collapsed: boolean;
};

export function AppSidebar({ collapsed }: AppSidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? "is-collapsed" : ""}`}>
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
              title={item.label}
              to={item.to}
            >
              <span className="nav-item__icon">
                <Icon size={18} />
              </span>
              <span className="nav-item__label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
