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
        badge: "bg-amber-50 border-amber-200 text-amber-800",
        iconColor: "text-amber-600",
      };
    }
    if (t.includes("cafe") || t.includes("coffee") || t.includes("bakery")) {
      return {
        icon: Coffee,
        label: "Cafe",
        badge: "bg-orange-50 border-orange-200 text-orange-800",
        iconColor: "text-orange-600",
      };
    }
    if (t.includes("museum") || t.includes("tourism") || t.includes("attraction")) {
      return {
        icon: Landmark,
        label: "Attraction",
        badge: "bg-sky-50 border-sky-200 text-sky-800",
        iconColor: "text-sky-600",
      };
    }
    if (t.includes("supermarket") || t.includes("store") || t.includes("shop")) {
      return {
        icon: Store,
        label: "Shopping",
        badge: "bg-emerald-50 border-emerald-200 text-emerald-800",
        iconColor: "text-emerald-600",
      };
    }
    return {
      icon: Building2,
      label: type,
      badge: "bg-slate-100 border-slate-200 text-slate-700",
      iconColor: "text-slate-500",
    };
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <Compass className="w-4 h-4" style={{ color: "#0d9488" } as any} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Discovered Places & Dining</h2>
            <p className="text-[11px] font-medium text-slate-500">
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
                  className={`px-3 py-1 rounded-xl text-[11px] font-semibold capitalize transition-all flex-shrink-0 ${
                    isActive
                      ? "text-white"
                      : "bg-slate-100 hover:bg-slate-200/70 text-slate-600 border border-slate-200/60"
                  }`}
                  style={isActive ? { background: "#0d9488" } : {}}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
              className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 transition-all flex flex-col justify-between group shadow-2xs"
            >
              <div>
                {/* Top Badge */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border capitalize ${config.badge}`}
                  >
                    <Icon className={`w-3 h-3 ${config.iconColor}`} />
                    {config.label}
                  </span>

                  {place.lat && place.lon && (
                    <span className="text-[10px] font-mono flex items-center gap-0.5" style={{ color: "#a8a29e" }}>
                      <Navigation className="w-2.5 h-2.5" style={{ color: "#0d9488" } as any} />
                      GPS
                    </span>
                  )}
                </div>

                {/* Place Name */}
                <h3 className="text-xs font-bold leading-snug transition-colors" style={{ color: "#1c1917" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#0d9488")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#1c1917")}>
                  {place.name}
                </h3>

                {/* Address */}
                {place.address && (
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-start gap-1.5 leading-relaxed">
                    <MapPin className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{place.address}</span>
                  </p>
                )}

                {/* Meta details (hours, phone) */}
                <div className="mt-2.5 space-y-1">
                  {place.opening_hours && (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-700">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{place.opening_hours}</span>
                    </div>
                  )}

                  {place.phone && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <Phone className="w-3 h-3 shrink-0 text-blue-500" />
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
                className="mt-3.5 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-colors"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#0f766e" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#dcfce7"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#f0fdf4"; }}
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

