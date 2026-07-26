"use client";

import AppLayout from "@/components/AppLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { tripService, expenseService } from "@/services";
import { useState } from "react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, X, Wallet, TrendingUp, PiggyBank } from "lucide-react";

const COLORS = ["#0d9488", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#65a30d"];

export default function BudgetPage() {
  const [selectedTrip, setSelectedTrip] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: "Food", amount: "", currency: "USD", description: "" });

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
    mutationFn: () => expenseService.createExpense({
      trip_id: activeTrip!.id, category: form.category,
      amount: parseFloat(form.amount), currency: form.currency, description: form.description
    }),
    onSuccess: () => {
      refetch(); toast.success("Expense added!");
      setShowModal(false);
      setForm({ category: "Food", amount: "", currency: "USD", description: "" });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to add expense"),
  });

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = (activeTrip?.budget || 0) - totalSpent;
  const pct = activeTrip ? Math.min((totalSpent / activeTrip.budget) * 100, 100) : 0;

  const catMap: Record<string, number> = {};
  expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
  const chartData = Object.entries(catMap).map(([name, value]) => ({ name, value: +value.toFixed(2) }));

  const inputStyle = {
    background: "#faf7f2", border: "1.5px solid #e8e0d5", color: "#1c1917",
    borderRadius: 12, padding: "10px 14px", width: "100%", fontSize: 13, fontWeight: 500, outline: "none",
  };

  return (
    <AppLayout>
      {/* Add Expense Modal */}
      {showModal && activeTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(28,25,23,0.4)" }}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-4"
            style={{ background: "#ffffff", border: "1px solid #e8e0d5", boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base" style={{ color: "#1c1917" }}>Add Expense</h3>
              <button onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: "#f5f0e8", color: "#78716c" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {[
              { key: "category", label: "Category", type: "select", options: ["Food","Transport","Accommodation","Activities","Shopping","Other"] },
              { key: "amount", label: "Amount", type: "number" },
              { key: "currency", label: "Currency", type: "text" },
              { key: "description", label: "Description (optional)", type: "text" },
            ].map(({ key, label, type, options }) => (
              <div key={key}>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>{label}</label>
                {type === "select" ? (
                  <select value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    style={inputStyle as any}>
                    {options!.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={type} value={(form as any)[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    placeholder={key === "amount" ? "0.00" : ""}
                    style={inputStyle as any} />
                )}
              </div>
            ))}

            <button onClick={() => addMutation.mutate()}
              disabled={!form.amount || addMutation.isPending}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: form.amount && !addMutation.isPending ? "#0d9488" : "#a8a29e", color: "#ffffff" }}>
              {addMutation.isPending ? "Saving…" : "Save Expense"}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6 pb-10 px-1">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-extrabold text-xl" style={{ color: "#1c1917" }}>Budget Tracker</h2>
            <p className="text-xs font-medium mt-0.5" style={{ color: "#78716c" }}>Track expenses across your trips</p>
          </div>
          <div className="flex items-center gap-2">
            {trips.length > 1 && (
              <select value={selectedTrip || activeTrip?.id || ""} onChange={e => setSelectedTrip(e.target.value)}
                className="text-xs font-bold rounded-xl px-3 py-2 outline-none"
                style={{ background: "#ffffff", border: "1px solid #e8e0d5", color: "#1c1917" }}>
                {trips.map(t => <option key={t.id} value={t.id}>{t.destination}</option>)}
              </select>
            )}
            <button onClick={() => setShowModal(true)} disabled={!activeTrip}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: "#0d9488", color: "#ffffff" }}
              onMouseEnter={e => { if (activeTrip) e.currentTarget.style.background = "#0f766e"; }}
              onMouseLeave={e => { if (activeTrip) e.currentTarget.style.background = "#0d9488"; }}>
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        </div>

        {!activeTrip ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: "#ffffff", border: "2px dashed #e8e0d5" }}>
            <Wallet className="w-8 h-8 mx-auto mb-2" style={{ color: "#c8bfb0" } as any} />
            <p className="text-sm font-bold" style={{ color: "#1c1917" }}>Create a trip first</p>
            <p className="text-xs mt-1" style={{ color: "#a8a29e" }}>Budget tracking is tied to your trips.</p>
          </div>
        ) : (
          <>
            {/* 3 Stat Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Allocated", value: `${activeTrip.currency} ${activeTrip.budget.toLocaleString()}`, icon: Wallet, bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
                { label: "Spent", value: `${activeTrip.currency} ${totalSpent.toFixed(2)}`, icon: TrendingUp, bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
                { label: "Remaining", value: `${activeTrip.currency} ${remaining.toFixed(2)}`, icon: PiggyBank, bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
              ].map(({ label, value, icon: Icon, bg, border, text }) => (
                <div key={label} className="rounded-2xl p-5 flex items-center gap-3"
                  style={{ background: bg, border: `1px solid ${border}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: text + "22", color: text }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-base font-extrabold" style={{ color: text }}>{value}</p>
                    <p className="text-xs font-semibold" style={{ color: text, opacity: 0.7 }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="rounded-2xl p-5" style={{ background: "#ffffff", border: "1px solid #e8e0d5" }}>
              <div className="flex justify-between text-xs font-bold mb-2.5" style={{ color: "#57534e" }}>
                <span>Budget usage: {activeTrip.destination}</span>
                <span style={{ color: pct > 85 ? "#dc2626" : "#0d9488" }}>{pct.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#f5f0e8" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: pct > 85 ? "#dc2626" : "#0d9488" }} />
              </div>
            </div>

            {/* Charts */}
            {chartData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl p-5" style={{ background: "#ffffff", border: "1px solid #e8e0d5" }}>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider mb-4" style={{ color: "#a8a29e" }}>By Category</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" outerRadius={78} dataKey="value"
                        label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={false} fontSize={11}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${activeTrip.currency} ${v}`, "Amount"]}
                        contentStyle={{ background: "#fff", border: "1px solid #e8e0d5", borderRadius: 12, fontSize: 12, color: "#1c1917" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-2xl p-5" style={{ background: "#ffffff", border: "1px solid #e8e0d5" }}>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider mb-4" style={{ color: "#a8a29e" }}>Breakdown</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#78716c" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#78716c" }} />
                      <Tooltip formatter={(v: any) => [`${activeTrip.currency} ${v}`]}
                        contentStyle={{ background: "#fff", border: "1px solid #e8e0d5", borderRadius: 12, fontSize: 12, color: "#1c1917" }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Expense list */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e8e0d5" }}>
              <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid #f0ebe3" }}>
                <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#a8a29e" }}>Transactions</h3>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: "#f5f0e8", color: "#78716c" }}>
                  {expenses.length} items
                </span>
              </div>
              {expenses.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-bold" style={{ color: "#1c1917" }}>No expenses yet</p>
                  <p className="text-xs mt-1 font-medium" style={{ color: "#a8a29e" }}>Click "Add Expense" to log a transaction.</p>
                </div>
              ) : (
                <div>
                  {expenses.map((e, i) => (
                    <div key={e.id} className="flex items-center justify-between px-5 py-3.5 transition-colors"
                      style={{ borderTop: i > 0 ? "1px solid #f0ebe3" : "none" }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = "#faf7f2")}
                      onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "#1c1917" }}>{e.category}</p>
                        {e.description && <p className="text-xs font-medium mt-0.5" style={{ color: "#a8a29e" }}>{e.description}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold" style={{ color: "#1c1917" }}>{e.currency} {e.amount}</span>
                        <button onClick={() => deleteMutation.mutate(e.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ color: "#c8bfb0" }}
                          onMouseEnter={ev => { ev.currentTarget.style.background = "#fef2f2"; ev.currentTarget.style.color = "#dc2626"; }}
                          onMouseLeave={ev => { ev.currentTarget.style.background = "transparent"; ev.currentTarget.style.color = "#c8bfb0"; }}>
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
