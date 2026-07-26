export interface DestinationTheme {
  gradient: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
  tagline: string;
  pattern: string;
}

export const DESTINATION_THEMES: Record<string, DestinationTheme> = {
  tokyo: {
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
    badgeBg: "#e0e7ff",
    badgeText: "#3730a3",
    accentColor: "#6366f1",
    tagline: "Technology & Culture",
    pattern: "radial-gradient(circle at 85% 15%, rgba(244,63,94,0.35) 0%, transparent 55%)",
  },
  bali: {
    gradient: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #0d9488 100%)",
    badgeBg: "#d1fae5",
    badgeText: "#065f46",
    accentColor: "#10b981",
    tagline: "Tropical Coastal Escape",
    pattern: "radial-gradient(circle at 15% 85%, rgba(251,191,36,0.35) 0%, transparent 55%)",
  },
  paris: {
    gradient: "linear-gradient(135deg, #4c0519 0%, #881337 50%, #be123c 100%)",
    badgeBg: "#ffe4e6",
    badgeText: "#9f1239",
    accentColor: "#f43f5e",
    tagline: "Art & Architecture",
    pattern: "radial-gradient(circle at 75% 25%, rgba(253,164,175,0.35) 0%, transparent 55%)",
  },
  swiss: {
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
    badgeBg: "#e2e8f0",
    badgeText: "#1e293b",
    accentColor: "#64748b",
    tagline: "Alpine Trek & Nature",
    pattern: "radial-gradient(circle at 25% 25%, rgba(56,189,248,0.35) 0%, transparent 55%)",
  },
  default: {
    gradient: "linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #0d9488 100%)",
    badgeBg: "#ccfbf1",
    badgeText: "#115e59",
    accentColor: "#14b8a6",
    tagline: "Bespoke Itinerary",
    pattern: "radial-gradient(circle at 80% 20%, rgba(20,184,166,0.35) 0%, transparent 55%)",
  },
};

export function getDestinationTheme(dest: string): DestinationTheme {
  const lower = (dest || "").toLowerCase();
  if (lower.includes("tokyo") || lower.includes("japan")) return DESTINATION_THEMES.tokyo;
  if (lower.includes("bali") || lower.includes("indonesia")) return DESTINATION_THEMES.bali;
  if (lower.includes("paris") || lower.includes("france")) return DESTINATION_THEMES.paris;
  if (lower.includes("swiss") || lower.includes("alps") || lower.includes("switzerland")) return DESTINATION_THEMES.swiss;
  return DESTINATION_THEMES.default;
}
