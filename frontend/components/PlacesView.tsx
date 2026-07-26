"use client";

import React, { useState } from "react";
import { NearbyPlace } from "@/types";
import {
  UtensilsCrossed,
  Coffee,
  Landmark,
  Building2,
  MapPin,
  Clock,
  ExternalLink,
  Phone,
  Compass,
  Store,
  Navigation
} from "lucide-react";

interface PlacesViewProps {
  places: NearbyPlace[];
}

export default function PlacesView({ places }: PlacesViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  if (!places || places.length === 0) return null;

  // Extract unique categories
  const categories = ["all", ...Array.from(new Set(places.map((p) => p.type.toLowerCase())))];

  const filteredPlaces =
    activeCategory === "all"
      ? places
      : places.filter((p) => p.type.toLowerCase() === activeCategory);

  const getCategoryConfig = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("restaurant") || t.includes("food") || t.includes("dining")) {
      return {
        icon: UtensilsCrossed,
        label: "Restaurant",
        badge: "bg-amber-500/10 border-amber-500/20 text-amber-300",
        iconColor: "text-amber-400",
      };
    }
    if (t.includes("cafe") || t.includes("coffee") || t.includes("bakery")) {
      return {
        icon: Coffee,
        label: "Cafe",
        badge: "bg-orange-500/10 border-orange-500/20 text-orange-300",
        iconColor: "text-orange-400",
      };
    }
    if (t.includes("museum") || t.includes("tourism") || t.includes("attraction")) {
      return {
        icon: Landmark,
        label: "Attraction",
        badge: "bg-sky-500/10 border-sky-500/20 text-sky-300",
        iconColor: "text-sky-400",
      };
    }
    if (t.includes("supermarket") || t.includes("store") || t.includes("shop")) {
      return {
        icon: Store,
        label: "Shopping",
        badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
        iconColor: "text-emerald-400",
      };
    }
    return {
      icon: Building2,
      label: type,
      badge: "bg-zinc-500/10 border-zinc-500/20 text-zinc-300",
      iconColor: "text-zinc-400",
    };
  };

  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-sm space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Discovered Places & Dining</h2>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              {places.length} Spot{places.length > 1 ? "s" : ""} Found
            </p>
          </div>
        </div>

        {/* Category Filters */}
        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors flex-shrink-0 ${
                    isActive
                      ? "bg-white text-zinc-950 font-semibold shadow-sm"
                      : "bg-white/5 hover:bg-white/10 text-[hsl(var(--muted-foreground))] hover:text-white border border-white/5"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredPlaces.map((place, idx) => {
          const config = getCategoryConfig(place.type);
          const Icon = config.icon;
          const mapUrl =
            place.google_maps_url ||
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${place.name} ${place.address || ""}`
            )}`;

          return (
            <div
              key={idx}
              className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/15 rounded-xl p-3.5 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Top Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border capitalize ${config.badge}`}
                  >
                    <Icon className={`w-3 h-3 ${config.iconColor}`} />
                    {config.label}
                  </span>

                  {place.lat && place.lon && (
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono flex items-center gap-0.5">
                      <Navigation className="w-2.5 h-2.5 text-blue-400/70" />
                      GPS
                    </span>
                  )}
                </div>

                {/* Place Name */}
                <h3 className="text-xs font-semibold text-white leading-snug group-hover:text-blue-300 transition-colors">
                  {place.name}
                </h3>

                {/* Address */}
                {place.address && (
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1.5 flex items-start gap-1.5 leading-relaxed">
                    <MapPin className="w-3 h-3 text-red-400/80 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{place.address}</span>
                  </p>
                )}

                {/* Meta details (hours, phone) */}
                <div className="mt-2.5 space-y-1">
                  {place.opening_hours && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/90">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{place.opening_hours}</span>
                    </div>
                  )}

                  {place.phone && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                      <Phone className="w-3 h-3 shrink-0 text-blue-400/80" />
                      <span>{place.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <MapPin className="w-3 h-3" />
                <span>View on Google Maps</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
