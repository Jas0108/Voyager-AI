"use client";

import AppLayout from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripService } from "@/services";
import { Trip } from "@/types";
import Link from "next/link";
import { Plus, Map, CalendarDays, DollarSign, ArrowRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

function TripRow({ trip, onDelete }: { trip: Trip; onDelete: (id: string) => void }) {
  const start = format(new Date(trip.start_date), "MMM d");
  const end = format(new Date(trip.end_date), "MMM d, yyyy");
  const isActive = !trip.status || trip.status === "active";
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="group flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <Link href={`/trips/${trip.id}`} className="flex items-center gap-4 flex-1">
        <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-600/20 flex items-center justify-center">
          <Map className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-medium">{trip.destination}</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-0.5">
            <CalendarDays className="w-3 h-3" /> {start} – {end}
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium">{trip.currency} {trip.budget.toLocaleString()}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">budget</p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" : "bg-white/5 text-[hsl(var(--muted-foreground))] border border-white/10"}`}>
          {isActive ? "Active" : "Completed"}
        </span>
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1">
            <button onClick={() => onDelete(trip.id)} className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded transition-colors">
              Confirm
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={(e) => { e.preventDefault(); setShowDeleteConfirm(true); }} className="text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-colors p-1">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <Link href={`/trips/${trip.id}`} className="text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function TripsPage() {
  const queryClient = useQueryClient();
  const { data: trips = [], isLoading } = useQuery({ queryKey: ["trips"], queryFn: tripService.getTrips });

  const deleteTrip = useMutation({
    mutationFn: tripService.deleteTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip deleted successfully.");
    },
    onError: () => toast.error("Failed to delete trip."),
  });

  const handleDelete = (id: string) => {
    deleteTrip.mutate(id);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">My Trips</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{trips.length} trip{trips.length !== 1 ? "s" : ""} total</p>
          </div>
          <Link href="/trips/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Trip
          </Link>
        </div>

        {isLoading ? (
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16">
            <Map className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
            <p className="text-sm font-medium mb-2">No trips yet</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6">Create your first trip to get started.</p>
            <Link href="/trips/new" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Create Trip
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {trips.map((trip) => <TripRow key={trip.id} trip={trip} onDelete={handleDelete} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
