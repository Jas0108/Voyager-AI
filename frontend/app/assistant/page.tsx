"use client";

import AppLayout from "@/components/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tripService, assistantService } from "@/services";
import ExecutionPlanBadge from "@/components/ExecutionPlanBadge";
import FormattedMessage from "@/components/FormattedMessage";
import ItineraryView from "@/components/ItineraryView";
import PlacesView from "@/components/PlacesView";
import { Message, ChatResponse, ItineraryDay, NearbyPlace } from "@/types";
import { useState, useRef, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { Send, Compass, Plus } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl max-w-xs"
      style={{ background: "#f5f0e8", border: "1px solid #e8e0d5" }}>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="thinking-dot w-1.5 h-1.5 rounded-full" style={{ background: "#0d9488" }} />
        ))}
      </div>
      <span className="text-xs font-semibold" style={{ color: "#78716c" }}>Voyager AI is thinking…</span>
    </div>
  );
}

function AssistantContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || "";
  const isNewChat = searchParams.get("new") === "1";

  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: tripService.getTrips });
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [messages, setMessages] = useState<(Message & { plan?: string[], insights?: Record<string, string>, itinerary?: ItineraryDay[], nearby_places?: NearbyPlace[] })[]>([]);
  const [input, setInput] = useState(initialPrompt);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isThinking]);

  useEffect(() => {
    if (trips.length > 0 && !selectedTripId && !isNewChat) {
      setSelectedTripId(trips[0].id);
    }
  }, [trips, isNewChat, selectedTripId]);

  useEffect(() => {
    if (initialPrompt) setInput(initialPrompt);
    if (isNewChat) {
      setMessages([]);
    }
  }, [initialPrompt, isNewChat]);

  const activeTripId = selectedTripId;

  const handleTripChange = (val: string) => {
    if (val === "NEW_TRIP") {
      router.push("/trips/new");
    } else {
      setSelectedTripId(val);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isThinking || !activeTripId) return;
    const msg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setIsThinking(true);
    try {
      const res: ChatResponse = await assistantService.chat(activeTripId, msg);
      setMessages(prev => [...prev, {
        role: "assistant", content: res.response,
        plan: res.execution_plan, insights: res.insights,
        itinerary: res.itinerary, nearby_places: res.nearby_places
      }]);
      if (res.updated_trip) {
        queryClient.invalidateQueries({ queryKey: ["trips"] });
        queryClient.invalidateQueries({ queryKey: ["trip", activeTripId] });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "AI request failed.");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const SUGGESTIONS = [
    "Plan my trip itinerary",
    "Find nearby restaurants",
    "How much budget is left?",
    "Find attractions near my hotel",
  ];

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col space-y-4 px-1" style={{ height: "calc(100vh - 80px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-extrabold text-xl" style={{ color: "#1c1917" }}>AI Assistant</h2>
          <p className="text-xs font-medium mt-0.5" style={{ color: "#78716c" }}>Multi-Agent LangGraph Travel Planner</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedTripId} onChange={e => handleTripChange(e.target.value)}
            className="text-xs font-bold rounded-xl px-3 py-2 outline-none"
            style={{ background: "#ffffff", border: "1.5px solid #e8e0d5", color: "#1c1917" }}>
            <option value="">Select trip context…</option>
            {trips.map(t => <option key={t.id} value={t.id}>{t.destination}</option>)}
            <option value="NEW_TRIP">+ Create New Trip Context</option>
          </select>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-2xl"
        style={{ background: "#ffffff", border: "1px solid #e8e0d5", minHeight: 0 }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="py-10 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: "linear-gradient(135deg, #134e4a, #0d9488)" }}>
                <Compass className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-base" style={{ color: "#1c1917" }}>What would you like to plan?</h3>
                <p className="text-xs font-medium mt-1 max-w-sm mx-auto" style={{ color: "#78716c" }}>
                  Ask me to build itineraries, find restaurants, check your budget, or discover local attractions.
                </p>
              </div>
              {!activeTripId ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold px-4 py-2.5 rounded-xl inline-block"
                    style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
                    Please select a trip above or create a new trip context to start chatting.
                  </p>
                  <div>
                    <Link href="/trips/new" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: "#0d9488", color: "#ffffff" }}>
                      <Plus className="w-3.5 h-3.5" /> Create New Trip Context
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      className="text-left text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all"
                      style={{ background: "#f5f0e8", border: "1px solid #e8e0d5", color: "#57534e" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#0d9488"; e.currentTarget.style.color = "#0d9488"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e0d5"; e.currentTarget.style.color = "#57534e"; }}>
                      "{s}"
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`fade-in ${msg.role === "user" ? "flex justify-end" : ""}`}>
              <div className={`rounded-2xl px-4 py-3 max-w-[88%] text-sm leading-relaxed ${msg.role === "user" ? "chat-user" : "chat-assistant"}`}>
                {msg.role === "user" ? (
                  <p className="font-medium">{msg.content}</p>
                ) : (
                  <FormattedMessage content={msg.content} />
                )}
                {msg.itinerary && msg.itinerary.length > 0 && (
                  <div className="mt-4"><ItineraryView itinerary={msg.itinerary} /></div>
                )}
                {msg.nearby_places && msg.nearby_places.length > 0 && (
                  <div className="mt-4"><PlacesView places={msg.nearby_places} /></div>
                )}
                {msg.insights && Object.keys(msg.insights).length > 0 && (
                  <div className="mt-3 p-3 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <p className="text-xs font-extrabold uppercase tracking-wider mb-2" style={{ color: "#166534" }}>Trip Insights</p>
                    <ul className="space-y-1">
                      {Object.entries(msg.insights).map(([key, val]) => (
                        <li key={key} className="text-xs">
                          <span className="font-bold" style={{ color: "#1c1917" }}>{key}:</span>{" "}
                          <span style={{ color: "#57534e" }}>{val}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {msg.role === "assistant" && msg.plan && <ExecutionPlanBadge plan={msg.plan} />}
              </div>
            </div>
          ))}
          {isThinking && <ThinkingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 flex gap-2" style={{ borderTop: "1px solid #f0ebe3", background: "#faf7f2" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder={activeTripId ? "Ask about your trip…" : "Select a trip above first"}
            disabled={!activeTripId || isThinking}
            className="flex-1 text-sm font-medium rounded-xl px-4 py-2.5 outline-none transition-all"
            style={{ background: "#ffffff", border: "1.5px solid #e8e0d5", color: "#1c1917" }}
            onFocus={e => (e.target.style.borderColor = "#0d9488")}
            onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isThinking || !activeTripId}
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            style={{ background: !input.trim() || isThinking || !activeTripId ? "#e8e0d5" : "#0d9488" }}>
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="text-sm p-6" style={{ color: "#a8a29e" }}>Loading…</div>}>
        <AssistantContent />
      </Suspense>
    </AppLayout>
  );
}
