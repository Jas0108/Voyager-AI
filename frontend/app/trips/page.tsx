"use client";

import AppLayout from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripService } from "@/services";
import { Trip } from "@/types";
import Link from "next/link";
import { Plus, Map, CalendarDays, ArrowRight, Trash2, Search, MapPin } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

function TripRow({ trip, onDelete }: { trip: Trip; onDelete: (id: string) => void }) {
  const start = format(new Date(trip.start_date), "MMM d");
  const end = format(new Date(trip.end_date), "MMM d, yyyy");
  const isActive = !trip.status || trip.status === "active";
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="flex items-center justify-between p-5 rounded-2xl transition-all"
      style={{ background: "#ffffff", border: "1px solid #e8e0d5", boxShadow: "0 2px 8px rgba(0,0,0,0.01)" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#0d9488")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#e8e0d5")}>

      <Link href={`/trips/${trip.id}`} className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: isActive ? "#e6f4f1" : "#f5f0e8" }}>
          <MapPin className="w-5 h-5" style={{ color: isActive ? "#0d9488" : "#78716c" } as any} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base truncate" style={{ color: "#1c1917" }}>{trip.destination}</h3>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md flex-shrink-0"
              style={isActive
                ? { background: "#e6f4f1", color: "#0f766e" }
                : { background: "#f5f0e8", color: "#78716c" }}>
              {isActive ? "Active Trip" : "Completed"}
            </span>
          </div>
          <p className="text-xs flex items-center gap-1.5 mt-1 font-semibold" style={{ color: "#78716c" }}>
            <CalendarDays className="w-3.5 h-3.5" style={{ color: "#0d9488" } as any} /> {start} to {end}
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-extrabold" style={{ color: "#1c1917" }}>{trip.currency} {trip.budget.toLocaleString()}</p>
          <p className="text-[10px] font-semibold" style={{ color: "#78716c" }}>budget</p>
        </div>

        {showConfirm ? (
          <div className="flex items-center gap-1.5">
            <button onClick={() => onDelete(trip.id)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
              Delete
            </button>
            <button onClick={() => setShowConfirm(false)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: "#f5f0e8", color: "#78716c" }}>
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={e => { e.preventDefault(); setShowConfirm(true); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "#c8bfb0" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#c8bfb0"; }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        <Link href={`/trips/${trip.id}`}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: "#f5f0e8", color: "#78716c" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#0d9488"; e.currentTarget.style.color = "#ffffff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#f5f0e8"; e.currentTarget.style.color = "#78716c"; }}>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function TripsPage() {
  const queryClient = useQueryClient();
  const { data: trips = [], isLoading } = useQuery({ queryKey: ["trips"], queryFn: tripService.getTrips });
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "completed">("all");

  const deleteMutation = useMutation({
    mutationFn: tripService.deleteTrip,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trips"] }); toast.success("Trip deleted."); },
    onError: () => toast.error("Failed to delete trip."),
  });

  const filtered = trips.filter(t => {
    const matchSearch = t.destination.toLowerCase().includes(search.toLowerCase());
    const isActive = !t.status || t.status === "active";
    if (tab === "active") return matchSearch && isActive;
    if (tab === "completed") return matchSearch && !isActive;
    return matchSearch;
  });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12 px-1">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-extrabold text-xl" style={{ color: "#1c1917" }}>My Trips</h2>
            <p className="text-xs font-semibold mt-0.5" style={{ color: "#78716c" }}>
              {trips.length} trip{trips.length !== 1 ? "s" : ""} planned
            </p>
          </div>
          <Link href="/trips/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold"
            style={{ background: "#0d9488", color: "#ffffff" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#0f766e")}
            onMouseLeave={e => (e.currentTarget.style.background = "#0d9488")}>
            <Plus className="w-4 h-4" /> New Trip
          </Link>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 p-3.5 rounded-2xl" style={{ background: "#ffffff", border: "1px solid #e8e0d5" }}>
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "#f5f0e8" }}>
            {(["all", "active", "completed"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                style={tab === t
                  ? { background: "#ffffff", color: "#0d9488", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                  : { color: "#78716c" }}>
                {t}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#a8a29e" } as any} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search destination..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-semibold outline-none"
              style={{ background: "#f5f0e8", border: "1px solid transparent", color: "#1c1917" }}
              onFocus={e => (e.target.style.border = "1px solid #0d9488")}
              onBlur={e => (e.target.style.border = "1px solid transparent")} />
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm font-medium py-4" style={{ color: "#a8a29e" }}>Loading trips...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl p-12 text-center space-y-3" style={{ background: "#ffffff", border: "2px dashed #e8e0d5" }}>
            <Map className="w-8 h-8 mx-auto" style={{ color: "#c8bfb0" } as any} />
            <p className="font-extrabold text-base" style={{ color: "#1c1917" }}>No trips found</p>
            <p className="text-xs font-medium" style={{ color: "#78716c" }}>
              {trips.length === 0 ? "Create your first trip workspace to get started." : "Try adjusting your search query."}
            </p>
            <Link href="/trips/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold mt-2"
              style={{ background: "#0d9488", color: "#ffffff" }}>
              <Plus className="w-4 h-4" /> Create Trip
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filtered.map(trip => <TripRow key={trip.id} trip={trip} onDelete={id => deleteMutation.mutate(id)} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
