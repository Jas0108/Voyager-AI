import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Voyager AI – Multi-Agent Travel Assistant",
  description:
    "AI-powered travel assistant using LangGraph Supervisor Pattern. Plan trips, discover nearby places, and track your budget with specialized AI agents.",
  keywords: "travel, AI, LangGraph, itinerary, budget tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
