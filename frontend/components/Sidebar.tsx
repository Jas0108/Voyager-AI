"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Map, Wallet, MessageSquare, Settings, LogOut, Compass, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { authService } from "@/services";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trips", label: "My Trips", icon: Map },
  { href: "/assistant", label: "AI Assistant", icon: MessageSquare },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    authService.logout();
    router.push("/login");
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: "rgba(28,25,23,0.4)" }} onClick={onClose} />
      )}

      <aside className={cn(
        "fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300",
        "lg:translate-x-0 lg:static lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full"
      )} style={{ width: 240, background: "#ffffff", borderRight: "1px solid #e8e0d5" }}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: "1px solid #f0ebe3" }}>
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#134e4a" }}>
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight" style={{ color: "#1c1917" }}>Voyager AI</span>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#a8a29e" }}>Travel OS</p>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg" style={{ color: "#a8a29e" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={isActive
                  ? { background: "#f0fdf4", color: "#0f766e", fontWeight: 700 }
                  : { color: "#57534e" }
                }
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#faf7f2"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={isActive
                    ? { background: "#0d9488", color: "#ffffff" }
                    : { background: "#f5f0e8", color: "#78716c" }
                  }>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#0d9488" }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid #f0ebe3" }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ color: "#78716c" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fff1f2"; e.currentTarget.style.color = "#e11d48"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#78716c"; }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#f5f0e8", color: "#a8a29e" }}>
              <LogOut className="w-3.5 h-3.5" />
            </div>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
