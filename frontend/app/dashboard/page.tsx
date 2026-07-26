"use client";

import AppLayout from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { tripService } from "@/services";
import { useAuthUser } from "@/hooks/useAuthUser";
import { formatUsername } from "@/lib/utils";
import { Trip } from "@/types";
import Link from "next/link";
import { Plus, Map, Wallet, MessageSquare, ArrowRight, CalendarDays, DollarSign } from "lucide-react";
import { format } from "date-fns";

function TripCard({ trip }: { trip: Trip }) {
  const start = format(new Date(trip.start_date), "MMM d");
  const end = format(new Date(trip.end_date), "MMM d, yyyy");
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-blue-600/30 rounded-xl p-5 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm mb-0.5">{trip.destination}</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> {start} – {end}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] group-hover:text-white transition-colors" />
      </div>
      <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
        <DollarSign className="w-3 h-3" />
        {trip.currency} {trip.budget.toLocaleString()} budget
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const user = useAuthUser();
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: tripService.getTrips,
  });

  const quickActions = [
    { label: "Create Trip", href: "/trips/new", icon: Plus, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    { label: "View Budget", href: "/budget", icon: Wallet, color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
    { label: "AI Assistant", href: "/assistant", icon: MessageSquare, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
    { label: "My Trips", href: "/trips", icon: Map, color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">
            Welcome back{user ? `, ${formatUsername(user)}` : ""}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Here's what's happening with your trips.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total Trips", value: trips.length, icon: Map, color: "text-blue-400" },
            { label: "Active Trips", value: trips.filter(t => !t.status || t.status === "active").length, icon: CalendarDays, color: "text-emerald-400" },
            { label: "Destinations", value: new Set(trips.map(t => t.destination)).size, icon: Map, color: "text-purple-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4">
              <Icon className={`w-4 h-4 mb-2 ${color}`} />
              <div className="text-xl font-semibold">{value}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-3 uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map(({ label, href, icon: Icon, color }) => (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${color} bg-transparent hover:bg-white/5 transition-colors text-sm font-medium`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Trips */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Recent Trips</h2>
            <Link href="/trips" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View all →</Link>
          </div>
          {isLoading ? (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading trips...</div>
          ) : trips.length === 0 ? (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-8 text-center">
              <Map className="w-8 h-8 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">No trips yet</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Create your first trip to get started.</p>
              <Link href="/trips/new" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors">
                <Plus className="w-3.5 h-3.5" /> Create Trip
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trips.slice(0, 6).map((trip) => <TripCard key={trip.id} trip={trip} />)}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
