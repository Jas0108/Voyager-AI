"use client";

import Link from "next/link";
import { Compass, Map, MessageSquare, Wallet, ArrowRight, Sparkles, Globe } from "lucide-react";

const features = [
  { icon: Map, title: "AI Itinerary Planning", desc: "Day-by-day plans with weather awareness and route optimization." },
  { icon: MessageSquare, title: "Nearby Discovery", desc: "Finds top restaurants, cafes, museums and hidden gems near you." },
  { icon: Wallet, title: "Budget Tracking", desc: "Tracks expenses, converts currencies and forecasts spending." },
  { icon: Globe, title: "Multi-Agent System", desc: "A Supervisor routes your request to the right specialist agent automatically." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "#f5f0e8", color: "#1c1917" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-40" style={{ background: "rgba(245,240,232,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e8e0d5" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#134e4a" }}>
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight" style={{ color: "#1c1917" }}>Voyager AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
              style={{ color: "#57534e" }}
              onMouseEnter={undefined}
            >
              Sign in
            </Link>
            <Link href="/login?tab=signup"
              className="text-sm font-bold px-4 py-2.5 rounded-xl transition-all"
              style={{ background: "#0d9488", color: "#ffffff" }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-8"
          style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
          <Sparkles className="w-3.5 h-3.5" />
          Multi-Agent AI Travel Platform
        </div>
        <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight" style={{ color: "#1c1917" }}>
          Plan smarter.<br />
          <span style={{ color: "#0d9488" }}>Travel better.</span>
        </h1>
        <p className="text-lg mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: "#57534e" }}>
          Voyager AI is your intelligent travel companion that builds custom itineraries, discovers hidden gems nearby, and tracks your budget automatically.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/login?tab=signup"
            className="flex items-center gap-2 text-sm font-bold px-6 py-3.5 rounded-xl transition-all group"
            style={{ background: "#0d9488", color: "#ffffff", boxShadow: "0 4px 14px rgba(13,148,136,0.3)" }}>
            Start Planning Free <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link href="/login"
            className="text-sm font-semibold px-6 py-3.5 rounded-xl transition-all"
            style={{ background: "#ffffff", color: "#57534e", border: "1px solid #e8e0d5" }}>
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold tracking-tight mb-2" style={{ color: "#1c1917" }}>Everything you need for effortless travel</h2>
          <p className="text-sm" style={{ color: "#78716c" }}>Specialized AI agents working together for your journey.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map(({ icon: Icon, title, desc }, i) => {
            const colors = [
              { bg: "#f0fdf4", border: "#bbf7d0", icon: "#0d9488" },
              { bg: "#fffbeb", border: "#fde68a", icon: "#d97706" },
              { bg: "#faf5ff", border: "#e9d5ff", icon: "#7c3aed" },
              { bg: "#fff1f2", border: "#fecaca", icon: "#dc2626" },
            ];
            const c = colors[i];
            return (
              <div key={title} className="p-6 rounded-2xl transition-all duration-200"
                style={{ background: "#ffffff", border: "1px solid #e8e0d5" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                  <Icon className="w-5 h-5" style={{ color: c.icon } as any} />
                </div>
                <h3 className="font-bold text-base mb-1.5" style={{ color: "#1c1917" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#78716c" }}>{desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-3xl p-10 text-center"
          style={{ background: "linear-gradient(135deg, #134e4a 0%, #0f766e 100%)", position: "relative", overflow: "hidden" }}>
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #99f6e4 0%, transparent 50%)" }} />
          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold mb-3 text-white">Ready for your next adventure?</h2>
            <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: "#99f6e4" }}>
              Let Voyager AI take care of planning so you can focus on experiencing.
            </p>
            <Link href="/login?tab=signup"
              className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3.5 rounded-xl transition-all"
              style={{ background: "#ffffff", color: "#0f766e" }}>
              Get Started for Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs" style={{ borderTop: "1px solid #e8e0d5", color: "#a8a29e" }}>
        Voyager AI · Multi-Agent Travel Intelligence
      </footer>
    </div>
  );
}
