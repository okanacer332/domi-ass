import {
  BellRing,
  BookMarked,
  Inbox,
  LayoutDashboard,
  Settings,
  type LucideIcon,
  Users
} from "lucide-react";

export type AppNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export const appNavigation: AppNavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mukellefler", label: "Mükellefler", icon: Users },
  { to: "/mizan-kodlari", label: "Mizan Kodları", icon: BookMarked },
  { to: "/gelen-kutusu", label: "Gelen Kutusu", icon: Inbox },
  { to: "/hatirlatmalar", label: "Hatırlatmalar", icon: BellRing },
  { to: "/ayarlar", label: "Ayarlar", icon: Settings }
];
