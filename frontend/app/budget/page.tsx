"use client";

import AppLayout from "@/components/AppLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { tripService, expenseService } from "@/services";
import { useState } from "react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, DollarSign, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export default function BudgetPage() {
  const [selectedTrip, setSelectedTrip] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: "Food", amount: "", currency: "USD", description: "" });

  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: tripService.getTrips });
  const activeTrip = trips.find(t => t.id === selectedTrip) || trips[0];

  const { data: expenses = [], refetch } = useQuery({
    queryKey: ["expenses", activeTrip?.id],
    queryFn: () => expenseService.getExpenses(activeTrip!.id),
    enabled: !!activeTrip,
  });

  const deleteMutation = useMutation({
    mutationFn: expenseService.deleteExpense,
    onSuccess: () => { refetch(); toast.success("Expense deleted."); },
  });

  const addMutation = useMutation({
    mutationFn: () => expenseService.createExpense({ trip_id: activeTrip!.id, category: expenseForm.category, amount: parseFloat(expenseForm.amount), currency: expenseForm.currency, description: expenseForm.description }),
    onSuccess: () => { refetch(); toast.success("Expense added!"); setShowModal(false); setExpenseForm({ category: "Food", amount: "", currency: "USD", description: "" }); },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed"),
  });

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = (activeTrip?.budget || 0) - totalSpent;
  const budgetPct = activeTrip ? Math.min((totalSpent / activeTrip.budget) * 100, 100) : 0;

  // Chart data
  const categoryMap: Record<string, number> = {};
  expenses.forEach(e => { categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount; });
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  const barData = pieData.map(d => ({ ...d }));

  return (
    <AppLayout>
      {showModal && activeTrip && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-sm">Add Expense</h3>
              <button onClick={() => setShowModal(false)}><X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" /></button>
            </div>
            <div className="space-y-4">
              {[["Category", "select", ["Food","Transport","Accommodation","Activities","Shopping","Other"]], ["Amount","number"],["Currency","text"],["Description","text"]].map(([label, type, options]: any) => (
                <div key={label}>
                  <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">{label}</label>
                  {type === "select" ? (
                    <select value={(expenseForm as any)[label.toLowerCase()]} onChange={e => setExpenseForm({...expenseForm, [label.toLowerCase()]: e.target.value})} className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none">
                      {options.map((o: string) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={(expenseForm as any)[label.toLowerCase()]} onChange={e => setExpenseForm({...expenseForm, [label.toLowerCase()]: e.target.value})} placeholder={label === "Amount" ? "50" : ""} className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none" />
                  )}
                </div>
              ))}
              <button onClick={() => addMutation.mutate()} disabled={!expenseForm.amount || addMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                {addMutation.isPending ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold">Budget</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Track and manage your trip expenses.</p>
          </div>
          <div className="flex items-center gap-3">
            {trips.length > 1 && (
              <select value={selectedTrip || activeTrip?.id || ""} onChange={e => setSelectedTrip(e.target.value)} className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm outline-none">
                {trips.map(t => <option key={t.id} value={t.id}>{t.destination}</option>)}
              </select>
            )}
            <button onClick={() => setShowModal(true)} disabled={!activeTrip} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        </div>

        {!activeTrip ? (
          <div className="text-center py-16 text-sm text-[hsl(var(--muted-foreground))]">Create a trip first to track budget.</div>
        ) : (
          <>
            {/* Budget Summary */}
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">{activeTrip.destination}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${budgetPct > 90 ? "bg-red-400/10 text-red-400 border border-red-400/20" : "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"}`}>
                  {budgetPct.toFixed(0)}% used
                </span>
              </div>
              <Progress value={budgetPct} className="h-1.5 mb-4" />
              <div className="grid grid-cols-3 gap-4 text-center">
                {[{ label: "Total Budget", value: `${activeTrip.currency} ${activeTrip.budget.toLocaleString()}` }, { label: "Total Spent", value: `${activeTrip.currency} ${totalSpent.toFixed(2)}` }, { label: "Remaining", value: `${activeTrip.currency} ${remaining.toFixed(2)}` }].map(({ label, value }) => (
                  <div key={label}><div className="text-lg font-semibold">{value}</div><div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{label}</div></div>
                ))}
              </div>
            </div>

            {/* Charts */}
            {pieData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-4">Expense by Category</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }: any) => `${String(name ?? "")} ${((Number(percent) ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${activeTrip.currency} ${v}`, "Amount"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-4">Spending Breakdown</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip formatter={(v: any) => [`${activeTrip.currency} ${v}`]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Expenses Table */}
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[hsl(var(--border))] flex items-center justify-between">
                <h3 className="text-sm font-semibold">All Expenses</h3>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{expenses.length} items</span>
              </div>
              {expenses.length === 0 ? (
                <div className="p-8 text-center">
                  <DollarSign className="w-6 h-6 text-[hsl(var(--muted-foreground))] mx-auto mb-2" />
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">No expenses yet. Add your first one!</p>
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--border))]">
                  {expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium">{e.category}</p>
                        {e.description && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{e.description}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{e.currency} {e.amount}</span>
                        <button onClick={() => deleteMutation.mutate(e.id)} className="text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
