"use client";

import AppLayout from "@/components/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tripService, assistantService } from "@/services";
import ExecutionPlanBadge from "@/components/ExecutionPlanBadge";
import FormattedMessage from "@/components/FormattedMessage";
import ItineraryView from "@/components/ItineraryView";
import PlacesView from "@/components/PlacesView";
import { Message, ChatResponse, ItineraryDay, NearbyPlace } from "@/types";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Send, MessageSquare } from "lucide-react";

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl max-w-xs">
      <div className="flex gap-1">
        {[0,1,2].map((i) => <div key={i} className="thinking-dot w-1.5 h-1.5 rounded-full bg-blue-400" />)}
      </div>
      <span className="text-xs text-[hsl(var(--muted-foreground))]">Voyager AI is thinking...</span>
    </div>
  );
}

export default function AssistantPage() {
  const queryClient = useQueryClient();
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: tripService.getTrips });
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [messages, setMessages] = useState<(Message & { plan?: string[], insights?: Record<string, string>, itinerary?: ItineraryDay[], nearby_places?: NearbyPlace[] })[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isThinking]);
  useEffect(() => { if (trips.length > 0 && !selectedTripId) setSelectedTripId(trips[0].id); }, [trips]);

  const activeTripId = selectedTripId || trips[0]?.id;

  const sendMessage = async () => {
    if (!input.trim() || isThinking || !activeTripId) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsThinking(true);
    try {
      const res: ChatResponse = await assistantService.chat(activeTripId, userMsg);
      setMessages(prev => [...prev, { role: "assistant", content: res.response, plan: res.execution_plan, insights: res.insights, itinerary: res.itinerary, nearby_places: res.nearby_places }]);
      if (res.nearby_places) setNearbyPlaces(res.nearby_places);
      if (res.updated_trip) {
        queryClient.invalidateQueries({ queryKey: ["trips"] });
        queryClient.invalidateQueries({ queryKey: ["trip", activeTripId] });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "AI request failed.");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold">AI Assistant</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5 font-medium">Smart Travel Planning Companion</p>
          </div>
          {trips.length > 1 && (
            <select value={activeTripId} onChange={e => setSelectedTripId(e.target.value)} className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm outline-none">
              {trips.map(t => <option key={t.id} value={t.id}>{t.destination}</option>)}
            </select>
          )}
        </div>

        <div className="flex-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl flex flex-col overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="py-12 text-center">
                <MessageSquare className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
                <p className="text-sm font-medium mb-1">Ask Voyager AI</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6">The AI Agent will plan itineraries, discover nearby places, and manage your budget.</p>
                {!activeTripId ? (
                  <p className="text-xs text-amber-400">Create a trip first to use the assistant.</p>
                ) : (
                  <div className="space-y-2 max-w-sm mx-auto">
                    {["Plan my trip itinerary", "Find nearby restaurants and cafes", "How much budget do I have left?", "Find museums near my hotel"].map((s) => (
                      <button key={s} onClick={() => setInput(s)} className="block w-full text-left text-xs bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg px-3 py-2 transition-colors text-[hsl(var(--muted-foreground))] hover:text-white">{s}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`fade-in ${msg.role === "user" ? "flex justify-end" : ""}`}>
                <div className={`rounded-xl px-4 py-3 max-w-[90%] text-sm leading-relaxed ${msg.role === "user" ? "chat-user text-white" : "chat-assistant"}`}>
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <FormattedMessage content={msg.content} />
                  )}
                  
                  {msg.itinerary && msg.itinerary.length > 0 && (
                    <div className="mt-4">
                      <ItineraryView itinerary={msg.itinerary} />
                    </div>
                  )}

                  {msg.nearby_places && msg.nearby_places.length > 0 && (
                    <div className="mt-4">
                      <PlacesView places={msg.nearby_places} />
                    </div>
                  )}

                  {msg.insights && Object.keys(msg.insights).length > 0 && (
                    <div className="mt-4 mb-2 p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Trip Insights</p>
                      <ul className="space-y-1">
                        {Object.entries(msg.insights).map(([key, value]) => (
                          <li key={key} className="text-xs">
                            <span className="font-medium text-white/90">{key}:</span> <span className="text-white/70">{value}</span>
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

          <div className="p-4 border-t border-[hsl(var(--border))]">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()} placeholder={activeTripId ? "Ask about your trip..." : "Select a trip first"} disabled={!activeTripId || isThinking} className="flex-1 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors disabled:opacity-50" />
              <button onClick={sendMessage} disabled={!input.trim() || isThinking || !activeTripId} className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

