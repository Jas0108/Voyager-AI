"use client";

import AppLayout from "@/components/AppLayout";
import ExecutionPlanBadge from "@/components/ExecutionPlanBadge";
import FormattedMessage from "@/components/FormattedMessage";
import ItineraryView from "@/components/ItineraryView";
import PlacesView from "@/components/PlacesView";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripService, expenseService, assistantService } from "@/services";
import { Message, ItineraryDay, NearbyPlace, ChatResponse } from "@/types";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Send, MapPin, CalendarDays, Wallet, Plus, Trash2, ExternalLink, Sun, Sunset, Moon, Sunrise, X, Edit2, CheckCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { use } from "react";

// ─── Thinking Indicator ────────────────────────────────────────────────────────
function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl max-w-xs">
      <div className="flex gap-1">
        {[0,1,2].map((i) => (
          <div key={i} className={`thinking-dot w-1.5 h-1.5 rounded-full bg-blue-400`} />
        ))}
      </div>
      <span className="text-xs text-[hsl(var(--muted-foreground))]">Voyager AI is thinking...</span>
    </div>
  );
}

// ─── Expense Modal ─────────────────────────────────────────────────────────────
function ExpenseModal({ tripId, currency, onClose, onSuccess }: any) {
  const [form, setForm] = useState({ category: "Food", amount: "", currency, description: "" });
  const categories = ["Food", "Transport", "Accommodation", "Activities", "Shopping", "Other"];

  const mutation = useMutation({
    mutationFn: () => {
      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }
      return expenseService.createExpense({ trip_id: tripId, category: form.category, amount, currency: form.currency, description: form.description });
    },
    onSuccess: () => { toast.success("Expense added!"); onSuccess(); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.detail || e.message || "Failed to add expense"),
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-sm">Add Expense</h3>
          <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Category</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none">
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Amount</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="50" className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Currency</label>
              <input value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Description (optional)</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Sushi dinner" className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none" />
          </div>
          <button onClick={() => mutation.mutate()} disabled={!form.amount || parseFloat(form.amount) <= 0 || mutation.isPending} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            {mutation.isPending ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<(Message & { plan?: string[] })[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: trip, isLoading: tripLoading, error: tripError } = useQuery({ queryKey: ["trip", id], queryFn: () => tripService.getTrip(id) });
  const { data: expenses = [], refetch: refetchExpenses } = useQuery({ queryKey: ["expenses", id], queryFn: () => expenseService.getExpenses(id) });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isThinking]);

  if (tripError) {
    toast.error("Failed to load trip. It may have been deleted.");
  }

  useEffect(() => {
    if (trip?.itinerary) setItinerary(trip.itinerary);
  }, [trip]);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remainingBudget = (trip?.budget || 0) - totalSpent;
  const budgetPct = trip?.budget ? Math.min((totalSpent / trip.budget) * 100, 100) : 0;

  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsThinking(true);

    try {
      const res: ChatResponse = await assistantService.chat(id, userMsg);
      setMessages(prev => [...prev, { role: "assistant", content: res.response, plan: res.execution_plan }]);
      if (res.itinerary?.length) setItinerary(res.itinerary);
      if (res.nearby_places?.length) setNearbyPlaces(res.nearby_places);
      if (res.updated_trip) {
        queryClient.setQueryData(["trip", id], (old: any) => old ? { ...old, ...res.updated_trip } : res.updated_trip);
        queryClient.invalidateQueries({ queryKey: ["trip", id] });
        queryClient.invalidateQueries({ queryKey: ["trips"] });
      }
      if (res.remaining_budget !== undefined) refetchExpenses();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "AI request failed.");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const deleteExpense = useMutation({
    mutationFn: expenseService.deleteExpense,
    onSuccess: () => { refetchExpenses(); toast.success("Expense deleted."); },
  });

  const clearItinerary = useMutation({
    mutationFn: () => tripService.clearItinerary(id),
    onSuccess: () => {
      setItinerary([]);
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      toast.success("Itinerary cleared.");
    },
    onError: () => toast.error("Failed to clear itinerary."),
  });

  const updateItinerary = useMutation({
    mutationFn: (newItinerary: ItineraryDay[]) => tripService.updateItinerary(id, newItinerary),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      toast.success("Itinerary updated.");
      setEditingItinerary(false);
    },
    onError: () => toast.error("Failed to update itinerary."),
  });

  const completeTrip = useMutation({
    mutationFn: () => tripService.completeTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip marked as completed!");
    },
    onError: () => toast.error("Failed to complete trip."),
  });

  if (tripLoading) return <AppLayout><div className="text-sm text-[hsl(var(--muted-foreground))] p-6">Loading trip...</div></AppLayout>;
  if (!trip) return <AppLayout><div className="p-6 text-center">
    <div className="text-sm text-red-400 mb-2">Trip not found</div>
    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">This trip may have been deleted or the ID is invalid.</p>
    <Link href="/trips" className="text-xs text-blue-400 hover:text-blue-300">← Back to My Trips</Link>
  </div></AppLayout>;

  return (
    <AppLayout>
      {showExpenseModal && <ExpenseModal tripId={id} currency={trip.currency} onClose={() => setShowExpenseModal(false)} onSuccess={refetchExpenses} />}

      <div className="max-w-7xl mx-auto">
        {/* Trip Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" /> {trip.destination}
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {format(new Date(trip.start_date), "MMM d")} – {format(new Date(trip.end_date), "MMM d, yyyy")}
              <span className="mx-1 text-white/10">·</span>
              <Wallet className="w-3.5 h-3.5" />
              {trip.currency} {trip.budget.toLocaleString()} budget
            </p>
          </div>
          <div className="flex gap-2">
            {(!trip.status || trip.status === "active") && (
              <button onClick={() => completeTrip.mutate()} disabled={completeTrip.isPending} className="flex items-center gap-2 bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                <CheckCircle className="w-3.5 h-3.5" /> {completeTrip.isPending ? "Completing..." : "Complete Trip"}
              </button>
            )}
            <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 text-blue-400 hover:bg-blue-600/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Expense
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* LEFT COLUMN */}
          <div className="xl:col-span-2 space-y-4">
            {/* Budget Card */}
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Budget Overview</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${budgetPct > 90 ? "bg-red-400/10 text-red-400 border border-red-400/20" : budgetPct > 70 ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" : "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"}`}>
                  {budgetPct.toFixed(0)}% used
                </span>
              </div>
              <Progress value={budgetPct} className="h-1.5 mb-4" />
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Budget", value: `${trip.currency} ${trip.budget.toLocaleString()}` },
                  { label: "Spent", value: `${trip.currency} ${totalSpent.toFixed(2)}` },
                  { label: "Remaining", value: `${trip.currency} ${remainingBudget.toFixed(2)}`, highlight: remainingBudget < 0 },
                ].map(({ label, value, highlight }) => (
                  <div key={label}>
                    <div className={`text-base font-semibold ${highlight ? "text-red-400" : ""}`}>{value}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              {/* Expenses list */}
              {expenses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] space-y-2">
                  {expenses.slice(0, 5).map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-xs">
                      <span className="text-[hsl(var(--muted-foreground))]">{e.category} {e.description ? `· ${e.description}` : ""}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{e.currency} {e.amount}</span>
                        <button onClick={() => deleteExpense.mutate(e.id)} className="text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Itinerary View */}
            {itinerary.length > 0 && (
              <ItineraryView
                itinerary={itinerary}
                editing={editingItinerary}
                onToggleEdit={() => setEditingItinerary(!editingItinerary)}
                onClear={() => clearItinerary.mutate()}
                onUpdate={(newItinerary) => updateItinerary.mutate(newItinerary)}
                isSaving={updateItinerary.isPending}
              />
            )}

            {/* Nearby Places */}
            {nearbyPlaces.length > 0 && <PlacesView places={nearbyPlaces} />}

            {/* Empty state when no AI results yet */}
            {itinerary.length === 0 && nearbyPlaces.length === 0 && (
              <div className="bg-[hsl(var(--card))] border border-dashed border-[hsl(var(--border))] rounded-xl p-8 text-center">
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">No itinerary yet</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Ask Voyager AI to plan your trip →</p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - AI ASSISTANT */}
          <div className="xl:col-span-1">
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl flex flex-col h-[600px] sticky top-20">
              {/* Chat Header */}
              <div className="px-4 py-3.5 border-b border-[hsl(var(--border))] flex-shrink-0">
                <h2 className="text-sm font-semibold">AI Assistant</h2>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Smart Travel Companion</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Try asking:</p>
                    {[`Plan my ${trip.destination} trip`, `Find restaurants near my hotel`, "How much budget is left?"].map((s) => (
                      <button key={s} onClick={() => setInput(s)} className="block w-full text-left text-xs bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg px-3 py-2 mb-2 transition-colors text-[hsl(var(--muted-foreground))] hover:text-white">
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`fade-in ${msg.role === "user" ? "flex justify-end" : ""}`}>
                    <div className={`rounded-xl px-3.5 py-2.5 max-w-[90%] text-sm leading-relaxed ${msg.role === "user" ? "chat-user text-white" : "chat-assistant"}`}>
                      {msg.role === "user" ? (
                        msg.content
                      ) : (
                        <FormattedMessage content={msg.content} />
                      )}
                      {msg.role === "assistant" && msg.plan && <ExecutionPlanBadge plan={msg.plan} />}
                    </div>
                  </div>
                ))}

                {isThinking && <ThinkingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-[hsl(var(--border))] flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Ask anything about your trip..."
                    className="flex-1 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-xs outline-none focus:border-blue-500 transition-colors"
                    disabled={isThinking}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isThinking}
                    className="w-9 h-9 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

