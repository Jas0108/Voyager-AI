import Link from "next/link";
import { Plane, Map, Wallet, MessageSquare, ArrowRight, Bot } from "lucide-react";

const features = [
  { icon: Map, title: "AI Itinerary Planning", desc: "Planning Agent generates day by day itineraries with weather awareness and route optimization." },
  { icon: MessageSquare, title: "Nearby Discovery", desc: "Discovery Agent finds restaurants, museums, ATMs, hospitals, and more using real map data." },
  { icon: Wallet, title: "Smart Budget Tracking", desc: "Budget Agent tracks expenses, converts currencies, and forecasts your trip spending." },
  { icon: Bot, title: "Supervisor Routing", desc: "A Supervisor Agent intelligently routes your request to the right specialist agents automatically." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-white">
      {/* Navbar */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Plane className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm">Voyager AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/login?tab=signup" className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-colors font-medium">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Travel smarter with
          <span className="text-blue-400"> Voyager AI</span>
        </h1>
        <p className="text-lg text-[hsl(var(--muted-foreground))] mb-10 max-w-2xl mx-auto leading-relaxed">
          An AI travel assistant that plans your itinerary, discovers nearby places,
          and tracks your budget, all through a single conversation.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/login?tab=signup" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors text-sm">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="text-2xl font-semibold text-center mb-12">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6">
              <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-600/20 flex items-center justify-center mb-4">
                <Icon className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <h3 className="font-semibold mb-1.5 text-sm">{title}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center border-t border-white/5">
        <h2 className="text-2xl font-semibold mb-4">Start planning your next trip</h2>
        <p className="text-[hsl(var(--muted-foreground))] text-sm mb-8">
          Create an account and let Voyager AI plan your perfect journey.
        </p>
        <Link href="/login?tab=signup" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors text-sm">
          Get Started <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
        Voyager AI · Travel Assistant
      </footer>
    </div>
  );
}


