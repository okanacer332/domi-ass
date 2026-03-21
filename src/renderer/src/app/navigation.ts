import {
  BookMarked,
  CalendarDays,
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
  { to: "/planlama", label: "Planlama", icon: CalendarDays },
  { to: "/mukellefler", label: "Mukellefler", icon: Users },
  { to: "/mizan-kodlari", label: "Mizan Kodlari", icon: BookMarked },
  { to: "/gelen-kutusu", label: "Gelen Kutusu", icon: Inbox },
  { to: "/ayarlar", label: "Ayarlar", icon: Settings }
];
