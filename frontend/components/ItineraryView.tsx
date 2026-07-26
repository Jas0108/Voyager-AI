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
      dotBorder: "border-amber-400 bg-amber-100",
      iconColor: "text-amber-600",
      badgeClass: "bg-amber-50 border-amber-200/80 text-amber-800",
      data: currentDayData?.morning,
    },
    {
      slot: "afternoon" as const,
      label: "Afternoon",
      time: "01:00 PM",
      icon: Sun,
      dotBorder: "border-sky-400 bg-sky-100",
      iconColor: "text-sky-600",
      badgeClass: "bg-sky-50 border-sky-200/80 text-sky-800",
      data: currentDayData?.afternoon,
    },
    {
      slot: "evening" as const,
      label: "Evening",
      time: "06:30 PM",
      icon: Moon,
      dotBorder: "border-indigo-400 bg-indigo-100",
      iconColor: "text-indigo-600",
      badgeClass: "bg-indigo-50 border-indigo-200/80 text-indigo-800",
      data: currentDayData?.evening,
    },
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-5">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <Navigation className="w-4 h-4" style={{ color: "#0d9488" } as any} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Trip Schedule</h2>
            <p className="text-[11px] font-medium text-slate-500">
              {localItinerary.length} Day{localItinerary.length > 1 ? "s" : ""} Overview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleEdit && (
            <button
              onClick={onToggleEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200/60 text-slate-700 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              <span>{editing ? "Cancel" : "Edit"}</span>
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 transition-colors"
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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
                isActive
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200/70 text-slate-600 border border-slate-200/60"
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
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs" style={{ background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" }}>
              <CloudSun className="w-4 h-4 shrink-0" style={{ color: "#0d9488" } as any} />
              <span className="font-bold">Weather Forecast:</span>
              <span style={{ color: "#166534" }}>{currentDayData.weather_note}</span>
            </div>
          )}

          {/* Timeline Schedule */}
          <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {slotConfigs.map(({ slot, label, time, icon: Icon, dotBorder, iconColor, badgeClass, data }) => (
              <div key={slot} className="relative">
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-[17px] top-2 w-2.5 h-2.5 rounded-full border ${dotBorder}`}
                />

                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 transition-all hover:bg-slate-50 hover:border-slate-300 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${badgeClass}`}>
                        <Icon className={`w-3 h-3 ${iconColor}`} />
                        {label}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono font-medium">
                        {time}
                      </span>
                    </div>

                    {data?.location && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold transition-colors" style={{ color: "#0d9488" }}
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
                        <label className="text-[10px] font-bold text-slate-500">Activity</label>
                        <input
                          value={data?.activity || ""}
                          onChange={(e) => handleFieldChange(slot, "activity", e.target.value)}
                          placeholder="Activity..."
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-teal-600"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500">Location</label>
                          <input
                            value={data?.location || ""}
                            onChange={(e) => handleFieldChange(slot, "location", e.target.value)}
                            placeholder="Location..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-teal-600"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500">Duration</label>
                          <input
                            value={data?.duration || ""}
                            onChange={(e) => handleFieldChange(slot, "duration", e.target.value)}
                            placeholder="Duration..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-teal-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Pro Tip</label>
                        <input
                          value={data?.tips || ""}
                          onChange={(e) => handleFieldChange(slot, "tips", e.target.value)}
                          placeholder="Tip..."
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-teal-600"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-snug mb-1.5">
                        {data?.activity || "Explore freely"}
                      </h3>

                      {data?.duration && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 mb-2">
                          <Clock className="w-3 h-3" style={{ color: "#78716c" } as any} />
                          <span>{data.duration}</span>
                        </div>
                      )}

                      {data?.tips && (
                        <div className="mt-2 pl-3 py-1.5 border-l-2 border-amber-500 bg-amber-50 text-[11px] text-amber-900 font-medium rounded-r-lg flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{data.tips}</span>
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
        <div className="pt-3 border-t border-slate-100">
          <button
            onClick={() => onUpdate(localItinerary)}
            disabled={isSaving}
            className="w-full disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            style={{ background: "#0d9488" }}
          >
            <Check className="w-3.5 h-3.5" />
            {isSaving ? "Saving Changes..." : "Save Itinerary"}
          </button>
        </div>
      )}
    </div>
  );
}

