import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Voyager AI Multi Agent Travel Assistant",
  description:
    "AI-powered travel assistant using LangGraph Supervisor Pattern. Plan trips, discover nearby places, and track your budget with specialized AI agents.",
  keywords: "travel, AI, LangGraph, itinerary, budget tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased" style={{ background: "#f5f0e8", color: "#1c1917" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

