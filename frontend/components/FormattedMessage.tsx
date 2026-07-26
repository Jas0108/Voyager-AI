"use client";

import React from "react";
import {
  Sunrise,
  Sun,
  Moon,
  Clock,
  Lightbulb,
  Calendar,
  UtensilsCrossed,
  Coffee,
  MapPin,
  ExternalLink,
} from "lucide-react";

interface FormattedMessageProps {
  content: string;
}

export default function FormattedMessage({ content }: FormattedMessageProps) {
  if (!content) return null;

  const lines = content.split("\n");

  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const getSlotIcon = (lineLower: string) => {
    if (lineLower.includes("morning") || lineLower.includes("breakfast")) {
      return <Sunrise className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />;
    }
    if (lineLower.includes("afternoon") || lineLower.includes("lunch")) {
      return <Sun className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />;
    }
    if (
      lineLower.includes("evening") ||
      lineLower.includes("night") ||
      lineLower.includes("dinner")
    ) {
      return <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />;
    }
    return null;
  };

  const getPlaceIcon = (lineLower: string) => {
    if (
      lineLower.includes("cafe") ||
      lineLower.includes("café") ||
      lineLower.includes("coffee") ||
      lineLower.includes("bakery")
    ) {
      return <Coffee className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />;
    }
    if (
      lineLower.includes("restaurant") ||
      lineLower.includes("food") ||
      lineLower.includes("cuisine") ||
      lineLower.includes("dishes") ||
      lineLower.includes("dining") ||
      lineLower.includes("eat") ||
      lineLower.includes("lunch") ||
      lineLower.includes("dinner")
    ) {
      return <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />;
    }
    return null;
  };

  const extractPlaceName = (bulletText: string): string | null => {
    const boldMatch = bulletText.match(/\*\*(.*?)\*\*/);
    if (boldMatch && boldMatch[1]) {
      return boldMatch[1].trim();
    }
    return null;
  };

  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-700">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        const lineLower = trimmed.toLowerCase();

        // Detect Day Header e.g., "Day 1:", "# Day 1", "**Day 1**"
        const isDayHeader =
          /^#+\s*day\s*\d+/i.test(trimmed) ||
          /^day\s*\d+/i.test(trimmed) ||
          /^\*\*day\s*\d+/i.test(trimmed);

        if (isDayHeader) {
          const cleanTitle = trimmed
            .replace(/^#+\s*/, "")
            .replace(/\*\*/g, "")
            .trim();

          return (
            <div
              key={idx}
              className="mt-4 first:mt-0 mb-2 pb-1.5 border-b border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-900 tracking-wide"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{cleanTitle}</span>
            </div>
          );
        }

        // Detect Time Period Header e.g., "Morning:", "Afternoon:", "Evening:"
        const isTimePeriod =
          /^(morning|afternoon|evening|night|breakfast|lunch|dinner):/i.test(
            trimmed
          ) ||
          /^\*\*(morning|afternoon|evening|night|breakfast|lunch|dinner)\*\*/i.test(
            trimmed
          );

        if (isTimePeriod) {
          const icon = getSlotIcon(lineLower);
          return (
            <div
              key={idx}
              className="flex items-center gap-1.5 mt-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              {icon || <Clock className="w-3 h-3 text-blue-600" />}
              <span>{renderFormattedText(trimmed.replace(/\*\*/g, ""))}</span>
            </div>
          );
        }

        // Detect Bullet Points e.g., "- ", "* ", "• ", "1. "
        const isBullet =
          /^[•\-\*]\s+/.test(trimmed) || /^\d+[\.\)]\s+/.test(trimmed);
        if (isBullet) {
          const bulletText = trimmed
            .replace(/^[•\-\*]\s+/.test(trimmed) ? /^[•\-\*]\s+/ : /^\d+[\.\)]\s+/, "");
          const slotIcon = getSlotIcon(lineLower);
          const placeIcon = getPlaceIcon(lineLower);
          const extractedPlace = extractPlaceName(bulletText);

          // If it's a food/place item with a bold title, render as a clean dining card
          if (placeIcon && extractedPlace) {
            const mapQueryUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              extractedPlace
            )}`;

            return (
              <div
                key={idx}
                className="bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 rounded-xl p-3 my-2 transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    {placeIcon}
                    <span className="font-bold text-slate-900 text-xs">
                      {extractedPlace}
                    </span>
                  </div>
                  <a
                    href={mapQueryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 hover:text-blue-700 transition-colors shrink-0"
                  >
                    <MapPin className="w-2.5 h-2.5" />
                    <span>Maps</span>
                    <ExternalLink className="w-2 h-2 opacity-60" />
                  </a>
                </div>
                <div className="text-[11px] text-slate-600 leading-relaxed pl-5">
                  {renderFormattedText(
                    bulletText.replace(/\*\*(.*?)\*\*/, "").replace(/^[\s\-:]+/, "")
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              {slotIcon ? (
                slotIcon
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5 opacity-80" />
              )}
              <div className="flex-1 text-xs text-slate-700 leading-relaxed">
                {renderFormattedText(bulletText)}
              </div>
            </div>
          );
        }

        // Detect Tips/Note
        const isTip = /^(tip|pro tip|note|💡)/i.test(trimmed);
        if (isTip) {
          return (
            <div
              key={idx}
              className="my-2 pl-3 py-2 border-l-3 border-amber-500 bg-amber-50 text-amber-900 text-xs rounded-r-xl flex items-start gap-2 shadow-2xs"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">
                {renderFormattedText(trimmed)}
              </div>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-xs text-slate-700 leading-relaxed">
            {renderFormattedText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

