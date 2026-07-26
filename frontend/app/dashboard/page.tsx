"use client";

import AppLayout from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { tripService } from "@/services";
import { useAuthUser } from "@/hooks/useAuthUser";
import { formatUsername } from "@/lib/utils";
import { Trip } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, CalendarDays, ArrowRight, MapPin, MessageSquare, Compass, Globe, Map } from "lucide-react";
import { format } from "date-fns";

const TRIP_SUGGESTIONS = [
  {
    title: "Tokyo 4 Day Experience",
    category: "Food and Culture",
    destination: "Tokyo, Japan",
    days: 4,
    budget: 2000,
    interests: "technology, sushi, food, culture",
    prompt: "Plan a 4 day trip to Tokyo focusing on technology and sushi.",
    accent: "#f59e0b",
    badgeBg: "#fef3c7",
    badgeText: "#92400e",
  },
  {
    title: "Bali Beach Escape",
    category: "Beach and Relax",
    destination: "Bali, Indonesia",
    days: 7,
    budget: 1500,
    interests: "beach, relaxation, nature, resorts",
    prompt: "Plan a 7 day relaxing beach trip to Bali with a 1500 USD budget.",
    accent: "#0284c7",
    badgeBg: "#e0f2fe",
    badgeText: "#075985",
  },
  {
    title: "Paris Art and History",
    category: "Culture",
    destination: "Paris, France",
    days: 3,
    budget: 1800,
    interests: "museums, art, landmarks, history",
    prompt: "Create a 3 day Paris itinerary with historical landmarks and art museums.",
    accent: "#e11d48",
    badgeBg: "#ffe4e6",
    badgeText: "#9f1239",
  },
  {
    title: "Swiss Alps Trek",
    category: "Adventure",
    destination: "Swiss Alps, Switzerland",
    days: 5,
    budget: 2200,
    interests: "hiking, nature, mountains, adventure",
    prompt: "Plan a 5 day hiking trip in the Swiss Alps for backpackers.",
    accent: "#10b981",
    badgeBg: "#dcfce7",
    badgeText: "#166534",
  },
];

function BalancedTripCard({ trip }: { trip: Trip }) {
  const start = format(new Date(trip.start_date), "MMM d");
  const end = format(new Date(trip.end_date), "MMM d, yyyy");
  const isCompleted = trip.status === "completed";

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block rounded-2xl p-5 transition-all duration-200 border-t-3"
      style={{
        background: "#ffffff",
        borderLeft: "1px solid #e8e0d5",
        borderRight: "1px solid #e8e0d5",
        borderBottom: "1px solid #e8e0d5",
        borderTopColor: "#0d9488",
        boxShadow: "0 2px 6px rgba(0,0,0,0.015)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "#0d9488";
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(13,148,136,0.08)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "#e8e0d5";
        e.currentTarget.style.borderTopColor = "#0d9488";
        e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.015)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-block mb-1.5"
            style={isCompleted
              ? { background: "#f3f4f6", color: "#6b7280" }
              : { background: "#dcfce7", color: "#15803d" }}>
            {isCompleted ? "Completed" : "Active Trip"}
          </span>
          <h3 className="font-extrabold text-base truncate" style={{ color: "#1c1917" }}>
            {trip.destination}
          </h3>
        </div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:translate-x-0.5"
          style={{ background: "#e6f4f1", color: "#0d9488" }}>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="space-y-2 pt-2.5" style={{ borderTop: "1px solid #f0ebe3" }}>
        <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#78716c" }}>
          <CalendarDays className="w-3.5 h-3.5" style={{ color: "#0d9488" } as any} />
          {start} to {end}
        </p>
        <div className="flex items-center justify-between text-xs font-bold pt-0.5">
          <span style={{ color: "#78716c" }}>Budget</span>
          <span style={{ color: "#1c1917" }}>{trip.currency} {trip.budget.toLocaleString()}</span>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const user = useAuthUser();
  const router = useRouter();

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: tripService.getTrips,
  });

  const activeCount = trips.filter(t => !t.status || t.status === "active").length;
  const uniqueDests = new Set(trips.map(t => t.destination)).size;

  const handleSuggestionClick = (item: typeof TRIP_SUGGESTIONS[0]) => {
    const query = new URLSearchParams({
      destination: item.destination,
      budget: item.budget.toString(),
      interests: item.interests,
      prompt: item.prompt,
      days: item.days.toString(),
    }).toString();
    router.push(`/trips/new?${query}`);
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-7 py-2 px-1">

        {/* Slim & Elegant Warm Teal Welcome Banner */}
        <div className="rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-sm"
          style={{
            background: "linear-gradient(135deg, #115e59 0%, #0d9488 100%)",
            color: "#ffffff"
          }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.18)", color: "#ccfbf1", border: "1px solid rgba(255,255,255,0.2)" }}>
                Travel OS
              </span>
              <span className="text-xs font-medium text-teal-100">Workspace</span>
            </div>
            <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight mt-1.5">
              Welcome back, {formatUsername(user)}
            </h1>
            <p className="text-xs font-medium mt-1 text-teal-100/90">
              Manage your active travel itineraries or choose a trip suggestion below.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Link href="/assistant"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}>
              <MessageSquare className="w-3.5 h-3.5" /> AI Assistant
            </Link>
            <Link href="/trips/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all"
              style={{ background: "#ffffff", color: "#0f766e", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
              onMouseLeave={e => (e.currentTarget.style.background = "#ffffff")}>
              <Plus className="w-3.5 h-3.5" /> New Trip
            </Link>
          </div>
        </div>

        {/* Slim & Compact Stat Cards Bar */}
        <div className="grid grid-cols-3 gap-3.5">
          {[
            {
              label: "Total Trips",
              value: trips.length,
              bg: "#fffbe6",
              border: "#fde68a",
              text: "#78350f",
              iconBg: "#f59e0b",
              Icon: Map,
            },
            {
              label: "Active Plans",
              value: activeCount,
              bg: "#e6f4f1",
              border: "#bbf7d0",
              text: "#0f766e",
              iconBg: "#0d9488",
              Icon: MapPin,
            },
            {
              label: "Destinations",
              value: uniqueDests,
              bg: "#fdf2f8",
              border: "#fbcfe8",
              text: "#831843",
              iconBg: "#db2777",
              Icon: Globe,
            },
          ].map(({ label, value, bg, border, text, iconBg, Icon }) => (
            <div key={label} className="rounded-xl px-4 py-2.5 flex items-center justify-between transition-all"
              style={{ background: bg, border: `1px solid ${border}` }}>
              <div>
                <span className="text-xl font-extrabold tracking-tight" style={{ color: text }}>{value}</span>
                <span className="text-xs font-bold ml-2" style={{ color: text, opacity: 0.8 }}>{label}</span>
              </div>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: iconBg }}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>

        {/* Your Trips Section */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-base flex items-center gap-2" style={{ color: "#1c1917" }}>
              <Compass className="w-4.5 h-4.5" style={{ color: "#0d9488" } as any} /> Your Trips
            </h2>
            <Link href="/trips" className="text-xs font-bold transition-colors" style={{ color: "#0d9488" }}>View all →</Link>
          </div>

          {isLoading ? (
            <p className="text-sm font-medium py-3" style={{ color: "#a8a29e" }}>Loading trips...</p>
          ) : trips.length === 0 ? (
            <div className="rounded-2xl p-8 text-center space-y-3" style={{ background: "#ffffff", border: "2px dashed #e8e0d5" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto" style={{ background: "#e6f4f1" }}>
                <MapPin className="w-5 h-5" style={{ color: "#0d9488" } as any} />
              </div>
              <div>
                <h3 className="font-extrabold text-base mb-0.5" style={{ color: "#1c1917" }}>No trips planned yet</h3>
                <p className="text-xs font-medium max-w-xs mx-auto" style={{ color: "#78716c" }}>
                  Create your first trip workspace and Voyager AI will structure your itinerary.
                </p>
              </div>
              <Link href="/trips/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background: "#0d9488", color: "#ffffff" }}>
                <Plus className="w-3.5 h-3.5" /> Create First Trip
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trips.slice(0, 6).map(trip => <BalancedTripCard key={trip.id} trip={trip} />)}
            </div>
          )}
        </div>

        {/* Trip Suggestions Section */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-base flex items-center gap-2" style={{ color: "#1c1917" }}>
              <Globe className="w-4.5 h-4.5" style={{ color: "#0d9488" } as any} /> Trip Suggestions
            </h2>
            <Link href="/assistant" className="text-xs font-bold transition-colors" style={{ color: "#0d9488" }}>Open Assistant →</Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {TRIP_SUGGESTIONS.map((item) => (
              <button
                key={item.title}
                onClick={() => handleSuggestionClick(item)}
                className="group text-left p-4.5 rounded-2xl transition-all flex flex-col justify-between border-t-3"
                style={{
                  background: "#ffffff",
                  borderLeft: "1px solid #e8e0d5",
                  borderRight: "1px solid #e8e0d5",
                  borderBottom: "1px solid #e8e0d5",
                  borderTopColor: item.accent,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.015)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = item.accent;
                  e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.06)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#e8e0d5";
                  e.currentTarget.style.borderTopColor = item.accent;
                  e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.015)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-block mb-2"
                    style={{ background: item.badgeBg, color: item.badgeText }}>
                    {item.category}
                  </span>
                  <h3 className="font-extrabold text-sm mb-1" style={{ color: "#1c1917" }}>{item.title}</h3>
                  <p className="text-xs font-medium leading-relaxed line-clamp-2" style={{ color: "#78716c" }}>{item.prompt}</p>
                </div>

                <div className="text-xs font-bold mt-3.5 flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid #f0ebe3", color: item.accent }}>
                  <span>Select dates & plan</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
