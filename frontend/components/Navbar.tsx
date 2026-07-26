"use client";

import { Menu, Plane, User } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { formatUsername } from "@/lib/utils";

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const user = useAuthUser();

  return (
    <header className="h-14 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] flex items-center px-4 gap-4 sticky top-0 z-30">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo (mobile only) */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
          <Plane className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold">Voyager AI</span>
      </div>

      <div className="flex-1" />

      {/* User info */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <span className="text-xs font-semibold text-white/90 hidden sm:block">
          {formatUsername(user)}
        </span>
      </div>
    </header>
  );
}
