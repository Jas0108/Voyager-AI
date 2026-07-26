"use client";

import AppLayout from "@/components/AppLayout";
import ExecutionPlanBadge from "@/components/ExecutionPlanBadge";
import FormattedMessage from "@/components/FormattedMessage";
import ItineraryView from "@/components/ItineraryView";
import PlacesView from "@/components/PlacesView";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripService, expenseService, assistantService } from "@/services";
import { Message, ItineraryDay, NearbyPlace, ChatResponse } from "@/types";
import { useState, useRef, useEffect, use, Suspense } from "react";
import { toast } from "sonner";
import { Send, MapPin, CalendarDays, Wallet, Plus, Trash2, X, CheckCircle, Sparkles, Compass } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { useSearchParams } from "next/navigation";

// ─── Thinking Indicator ────────────────────────────────────────────────────────
function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl max-w-xs" style={{ background: "#f5f0e8", border: "1px solid #e8e0d5" }}>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="thinking-dot w-1.5 h-1.5 rounded-full" style={{ background: "#0d9488" }} />
        ))}
      </div>
      <span className="text-xs font-semibold" style={{ color: "#78716c" }}>Voyager AI is thinking...</span>
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

  const inputStyle = {
    background: "#faf7f2", border: "1.5px solid #e8e0d5", color: "#1c1917",
    borderRadius: 12, padding: "10px 14px", width: "100%", fontSize: 13, fontWeight: 500, outline: "none",
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(28,25,23,0.4)" }}>
      <div className="rounded-3xl p-6 w-full max-w-sm space-y-4" style={{ background: "#ffffff", border: "1px solid #e8e0d5", boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base" style={{ color: "#1c1917" }}>Add New Expense</h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "#a8a29e" }}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Category</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={inputStyle as any}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Amount</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="50" style={inputStyle as any} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Currency</label>
              <input value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} style={inputStyle as any} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Description (optional)</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Sushi dinner" style={inputStyle as any} />
          </div>
          <button onClick={() => mutation.mutate()} disabled={!form.amount || parseFloat(form.amount) <= 0 || mutation.isPending} className="w-full py-3 rounded-xl text-xs font-bold transition-all mt-2" style={{ background: form.amount && !mutation.isPending ? "#0d9488" : "#a8a29e", color: "#ffffff" }}>
            {mutation.isPending ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inner Component ───────────────────────────────────────────────────────────
function TripDetailContent({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams?.get("prompt") || "";
  const autoSentRef = useRef(false);

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

  const sendMessageText = async (msgText: string) => {
    if (!msgText.trim() || isThinking) return;
    setMessages(prev => [...prev, { role: "user", content: msgText }]);
    setIsThinking(true);
    try {
      const res: ChatResponse = await assistantService.chat(id, msgText);
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

  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const userMsg = input.trim();
    setInput("");
    await sendMessageText(userMsg);
  };

  useEffect(() => {
    if (initialPrompt && !autoSentRef.current && trip) {
      autoSentRef.current = true;
      sendMessageText(initialPrompt);
    }
  }, [initialPrompt, trip]);

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

  if (tripLoading) return <div className="text-xs p-6" style={{ color: "#a8a29e" }}>Loading trip details...</div>;
  if (!trip) return <div className="p-12 text-center rounded-3xl max-w-md mx-auto" style={{ background: "#ffffff", border: "1px solid #e8e0d5" }}>
    <div className="text-sm font-bold mb-2" style={{ color: "#dc2626" }}>Trip Not Found</div>
    <p className="text-xs mb-6" style={{ color: "#78716c" }}>This trip may have been deleted or the link is invalid.</p>
    <Link href="/trips" className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: "#0d9488" }}>← Back to My Trips</Link>
  </div>;

  return (
    <>
      {showExpenseModal && <ExpenseModal tripId={id} currency={trip.currency} onClose={() => setShowExpenseModal(false)} onSuccess={refetchExpenses} />}

      <div className="max-w-7xl mx-auto space-y-8 py-2">

        {/* Clean Spacious Trip Header */}
        <div className="rounded-3xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm"
          style={{ background: "#ffffff", border: "1px solid #e8e0d5" }}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-md"
                style={trip.status === "completed"
                  ? { background: "#f5f0e8", color: "#78716c" }
                  : { background: "#e6f4f1", color: "#0f766e" }}>
                {trip.status === "completed" ? "Completed Trip" : "Active Trip Workspace"}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#1c1917" }}>
              {trip.destination}
            </h1>
            <div className="flex items-center gap-4 text-xs font-medium mt-2" style={{ color: "#78716c" }}>
              <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" style={{ color: "#0d9488" } as any} /> {format(new Date(trip.start_date), "MMM d")} to {format(new Date(trip.end_date), "MMM d, yyyy")}</span>
              <span style={{ color: "#d6d3d1" }}>·</span>
              <span className="flex items-center gap-1.5"><Wallet className="w-4 h-4" style={{ color: "#166534" } as any} /> {trip.currency} {trip.budget.toLocaleString()} budget</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {(!trip.status || trip.status === "active") && (
              <button onClick={() => completeTrip.mutate()} disabled={completeTrip.isPending} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: "#f5f0e8", border: "1px solid #e8e0d5", color: "#44403c" }}>
                <CheckCircle className="w-4 h-4 text-emerald-600" /> {completeTrip.isPending ? "Completing..." : "Complete Trip"}
              </button>
            )}
            <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm" style={{ background: "#0d9488", color: "#ffffff" }}>
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* LEFT COLUMN */}
          <div className="xl:col-span-2 space-y-8">
            {/* Budget Card */}
            <div className="rounded-3xl p-7" style={{ background: "#ffffff", border: "1px solid #e8e0d5" }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#78716c" }}>Budget Overview</h2>
                <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={budgetPct > 90 ? { background: "#fef2f2", color: "#991b1b" } : budgetPct > 70 ? { background: "#fffbeb", color: "#92400e" } : { background: "#e6f4f1", color: "#0f766e" }}>
                  {budgetPct.toFixed(0)}% used
                </span>
              </div>
              <Progress value={budgetPct} className="h-2 mb-6" style={{ background: "#f5f0e8" }} />
              <div className="grid grid-cols-3 gap-4 text-center" style={{ borderTop: "1px solid #f0ebe3", paddingTop: "1.25rem" }}>
                {[
                  { label: "Budget", value: `${trip.currency} ${trip.budget.toLocaleString()}` },
                  { label: "Spent", value: `${trip.currency} ${totalSpent.toFixed(2)}` },
                  { label: "Remaining", value: `${trip.currency} ${remainingBudget.toFixed(2)}`, highlight: remainingBudget < 0 },
                ].map(({ label, value, highlight }) => (
                  <div key={label}>
                    <div className="text-base font-extrabold tracking-tight" style={{ color: highlight ? "#dc2626" : "#1c1917" }}>{value}</div>
                    <div className="text-xs font-semibold mt-0.5" style={{ color: "#78716c" }}>{label}</div>
                  </div>
                ))}
              </div>
              {/* Expenses list */}
              {expenses.length > 0 && (
                <div className="mt-5 pt-5 space-y-2.5" style={{ borderTop: "1px solid #f0ebe3" }}>
                  {expenses.slice(0, 5).map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-xs font-medium">
                      <span style={{ color: "#57534e" }}>{e.category} {e.description ? `· ${e.description}` : ""}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold" style={{ color: "#1c1917" }}>{e.currency} {e.amount}</span>
                        <button onClick={() => deleteExpense.mutate(e.id)} className="transition-colors p-1" style={{ color: "#c8bfb0" }}>
                          <Trash2 className="w-3.5 h-3.5" />
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
              <div className="rounded-3xl p-12 text-center space-y-3" style={{ background: "#ffffff", border: "2px dashed #e8e0d5" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "#e6f4f1" }}>
                  <Sparkles className="w-6 h-6" style={{ color: "#0d9488" } as any} />
                </div>
                <p className="text-base font-bold" style={{ color: "#1c1917" }}>No itinerary generated yet</p>
                <p className="text-xs font-medium max-w-sm mx-auto" style={{ color: "#78716c" }}>Ask Voyager AI in the assistant panel to build a personalized day-by-day plan for {trip.destination}.</p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - AI ASSISTANT */}
          <div className="xl:col-span-1">
            <div className="rounded-3xl flex flex-col h-[640px] sticky top-24 overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e8e0d5" }}>
              {/* Chat Header */}
              <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: "1px solid #f0ebe3", background: "#faf7f2" }}>
                <h2 className="text-sm font-extrabold tracking-tight flex items-center gap-2" style={{ color: "#1c1917" }}>
                  <Sparkles className="w-4 h-4" style={{ color: "#0d9488" } as any} /> Voyager Assistant
                </h2>
                <p className="text-xs font-medium mt-0.5" style={{ color: "#78716c" }}>Interactive Planning Agent</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-10 space-y-4">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#a8a29e" }}>Suggested Prompts</p>
                    <div className="space-y-2">
                      {[`Plan my ${trip.destination} trip`, `Find restaurants near my hotel`, "How much budget is left?"].map((s) => (
                        <button key={s} onClick={() => setInput(s)} className="block w-full text-left text-xs rounded-xl px-4 py-3 transition-all font-medium" style={{ background: "#f5f0e8", border: "1px solid #e8e0d5", color: "#57534e" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#0d9488"; e.currentTarget.style.color = "#0d9488"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e0d5"; e.currentTarget.style.color = "#57534e"; }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`fade-in ${msg.role === "user" ? "flex justify-end" : ""}`}>
                    <div className={`rounded-2xl px-4.5 py-3 max-w-[90%] text-sm leading-relaxed ${msg.role === "user" ? "chat-user" : "chat-assistant"}`}>
                      {msg.role === "user" ? (
                        <p className="font-medium">{msg.content}</p>
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
              <div className="p-4 flex-shrink-0" style={{ borderTop: "1px solid #f0ebe3", background: "#faf7f2" }}>
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Ask anything about your trip..."
                    className="flex-1 rounded-xl px-4 py-2.5 text-xs font-medium outline-none transition-colors"
                    style={{ background: "#ffffff", border: "1.5px solid #e8e0d5", color: "#1c1917" }}
                    onFocus={e => (e.target.style.borderColor = "#0d9488")}
                    onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
                    disabled={isThinking}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isThinking}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
                    style={{ background: !input.trim() || isThinking ? "#e8e0d5" : "#0d9488" }}
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppLayout>
      <Suspense fallback={<div className="text-xs p-6" style={{ color: "#a8a29e" }}>Loading trip details...</div>}>
        <TripDetailContent id={id} />
      </Suspense>
    </AppLayout>
  );
}
