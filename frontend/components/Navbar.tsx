"use client";

import { Menu, Compass, Bell, Plus, Search } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { formatUsername } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/trips": "My Trips",
  "/assistant": "AI Assistant",
  "/budget": "Budget",
  "/settings": "Settings",
};

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const user = useAuthUser();
  const pathname = usePathname();

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    key === pathname || (key !== "/dashboard" && pathname.startsWith(key))
  )?.[1] ?? "Voyager AI";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-5 h-[60px]"
      style={{ background: "rgba(245,240,232,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e8e0d5" }}>

      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "#78716c" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#ede8e0")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <Menu className="w-4 h-4" />
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#134e4a" }}>
            <Compass className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-extrabold text-sm" style={{ color: "#1c1917" }}>Voyager AI</span>
        </div>

        {/* Desktop page title */}
        <h1 className="hidden lg:block font-extrabold text-lg tracking-tight" style={{ color: "#1c1917" }}>
          {title}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Link href="/trips/new"
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
          style={{ background: "#0d9488", color: "#ffffff" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#0f766e")}
          onMouseLeave={e => (e.currentTarget.style.background = "#0d9488")}>
          <Plus className="w-3.5 h-3.5" /> New Trip
        </Link>

        {/* Avatar */}
        <Link href="/settings"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
          style={{ border: "1px solid #e8e0d5", background: "#faf7f2" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#c8bfb0")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#e8e0d5")}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white"
            style={{ background: "#134e4a" }}>
            {formatUsername(user).charAt(0).toUpperCase()}
          </div>
          <span className="hidden sm:block text-xs font-bold" style={{ color: "#1c1917" }}>
            {formatUsername(user)}
          </span>
        </Link>
      </div>
    </header>
  );
}
