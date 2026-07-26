"use client";

import React, { useState } from "react";
import { ItineraryDay } from "@/types";
import {
  Sunrise,
  Sun,
  Moon,
  MapPin,
  Clock,
  Lightbulb,
  Edit2,
  Trash2,
  CloudSun,
  Calendar,
  Check,
  ExternalLink,
  Navigation
} from "lucide-react";

interface ItineraryViewProps {
  itinerary: ItineraryDay[];
  editing?: boolean;
  onToggleEdit?: () => void;
  onClear?: () => void;
  onUpdate?: (newItinerary: ItineraryDay[]) => void;
  isSaving?: boolean;
}

export default function ItineraryView({
  itinerary,
  editing = false,
  onToggleEdit,
  onClear,
  onUpdate,
  isSaving = false,
}: ItineraryViewProps) {
  const [activeDay, setActiveDay] = useState<number>(1);
  const [localItinerary, setLocalItinerary] = useState<ItineraryDay[]>(itinerary);

  React.useEffect(() => {
    setLocalItinerary(itinerary);
  }, [itinerary]);

  if (!localItinerary || localItinerary.length === 0) {
    return null;
  }

  const currentDayData = localItinerary.find((d) => d.day === activeDay) || localItinerary[0];
  const dayIndex = localItinerary.findIndex((d) => d.day === activeDay);

  const handleFieldChange = (slot: "morning" | "afternoon" | "evening", field: string, value: string) => {
    const updated = [...localItinerary];
    if (dayIndex !== -1) {
      const dayData = { ...updated[dayIndex] };
      const slotData = { ...(dayData[slot] || { activity: "", location: "", duration: "", tips: "" }), [field]: value };
      dayData[slot] = slotData;
      updated[dayIndex] = dayData;
      setLocalItinerary(updated);
    }
  };

  const slotConfigs = [
    {
      slot: "morning" as const,
      label: "Morning",
      time: "08:00 AM",
      icon: Sunrise,
      dotBorder: "border-amber-500/80 bg-amber-500/20",
      iconColor: "text-amber-400",
      badgeClass: "bg-amber-500/10 border-amber-500/20 text-amber-300",
      data: currentDayData?.morning,
    },
    {
      slot: "afternoon" as const,
      label: "Afternoon",
      time: "01:00 PM",
      icon: Sun,
      dotBorder: "border-sky-500/80 bg-sky-500/20",
      iconColor: "text-sky-400",
      badgeClass: "bg-sky-500/10 border-sky-500/20 text-sky-300",
      data: currentDayData?.afternoon,
    },
    {
      slot: "evening" as const,
      label: "Evening",
      time: "06:30 PM",
      icon: Moon,
      dotBorder: "border-indigo-400/80 bg-indigo-400/20",
      iconColor: "text-indigo-400",
      badgeClass: "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",
      data: currentDayData?.evening,
    },
  ];

  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-sm space-y-5">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Navigation className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Trip Schedule</h2>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              {localItinerary.length} Day{localItinerary.length > 1 ? "s" : ""} Overview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleEdit && (
            <button
              onClick={onToggleEdit}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              <span>{editing ? "Cancel" : "Edit"}</span>
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {localItinerary.map((day) => {
          const isActive = day.day === activeDay;
          return (
            <button
              key={day.day}
              onClick={() => setActiveDay(day.day)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                isActive
                  ? "bg-white text-zinc-950 font-semibold shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-[hsl(var(--muted-foreground))] hover:text-white border border-white/5"
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Day {day.day}</span>
            </button>
          );
        })}
      </div>

      {/* Active Day Schedule */}
      {currentDayData && (
        <div className="space-y-4">
          {/* Weather Banner */}
          {currentDayData.weather_note && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-[hsl(var(--muted-foreground))]">
              <CloudSun className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="font-medium text-white/90">Weather:</span>
              <span>{currentDayData.weather_note}</span>
            </div>
          )}

          {/* Timeline Schedule */}
          <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
            {slotConfigs.map(({ slot, label, time, icon: Icon, dotBorder, iconColor, badgeClass, data }) => (
              <div key={slot} className="relative">
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full border ${dotBorder}`}
                />

                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 transition-colors hover:border-white/10">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${badgeClass}`}>
                        <Icon className={`w-3 h-3 ${iconColor}`} />
                        {label}
                      </span>
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-mono">
                        {time}
                      </span>
                    </div>

                    {data?.location && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>{data.location}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    )}
                  </div>

                  {editing ? (
                    <div className="space-y-2 mt-2">
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">Activity</label>
                        <input
                          value={data?.activity || ""}
                          onChange={(e) => handleFieldChange(slot, "activity", e.target.value)}
                          placeholder="Activity..."
                          className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[hsl(var(--muted-foreground))]">Location</label>
                          <input
                            value={data?.location || ""}
                            onChange={(e) => handleFieldChange(slot, "location", e.target.value)}
                            placeholder="Location..."
                            className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[hsl(var(--muted-foreground))]">Duration</label>
                          <input
                            value={data?.duration || ""}
                            onChange={(e) => handleFieldChange(slot, "duration", e.target.value)}
                            placeholder="Duration..."
                            className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">Pro Tip</label>
                        <input
                          value={data?.tips || ""}
                          onChange={(e) => handleFieldChange(slot, "tips", e.target.value)}
                          placeholder="Tip..."
                          className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xs font-semibold text-white/95 leading-relaxed mb-1.5">
                        {data?.activity || "Explore freely"}
                      </h3>

                      {data?.duration && (
                        <div className="inline-flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))] mb-2">
                          <Clock className="w-3 h-3 text-blue-400/80" />
                          <span>{data.duration}</span>
                        </div>
                      )}

                      {data?.tips && (
                        <div className="mt-2 pl-3 py-1.5 border-l-2 border-amber-500/50 bg-amber-500/[0.04] text-[11px] text-amber-200/90 rounded-r-md flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="leading-normal">{data.tips}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button when Editing */}
      {editing && onUpdate && (
        <div className="pt-3 border-t border-[hsl(var(--border))]">
          <button
            onClick={() => onUpdate(localItinerary)}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {isSaving ? "Saving Changes..." : "Save Itinerary"}
          </button>
        </div>
      )}
    </div>
  );
}
