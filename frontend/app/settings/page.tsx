"use client";

import AppLayout from "@/components/AppLayout";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/useAuthUser";
import { formatUsername } from "@/lib/utils";
import { Settings } from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "INR", "AUD", "CAD", "SGD"];
const FOOD_PREFS = ["No preference", "Vegetarian", "Vegan", "Halal", "Gluten-free", "Kosher"];
const TRAVEL_STYLES = ["Budget", "Backpacker", "Comfortable", "Luxury", "Adventure", "Cultural"];

export default function SettingsPage() {
  const user = useAuthUser();
  const [form, setForm] = useState({ food_preference: "", travel_style: "", favorite_categories: "", preferred_currency: "USD" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      toast.success("Preferences saved!");
    } catch {
      toast.error("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = {
    background: "#faf7f2",
    border: "1.5px solid #e8e0d5",
    color: "#1c1917",
    borderRadius: 12,
    padding: "10px 14px",
    width: "100%",
    fontSize: 13,
    fontWeight: 500,
    outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: "#1c1917" }}>
            <Settings className="w-5 h-5" style={{ color: "#0d9488" } as any} /> Account & Preferences
          </h1>
          <p className="text-xs font-medium mt-0.5" style={{ color: "#78716c" }}>Manage your personal profile and default AI trip planning parameters.</p>
        </div>

        {/* Profile Card */}
        <div className="rounded-3xl p-6" style={{ background: "#ffffff", border: "1px solid #e8e0d5" }}>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "#a8a29e" }}>User Profile</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-extrabold" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#0d9488" }}>
              {formatUsername(user).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-extrabold" style={{ color: "#1c1917" }}>{formatUsername(user)}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: "#78716c" }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Preferences Card */}
        <div className="rounded-3xl p-6 space-y-5" style={{ background: "#ffffff", border: "1px solid #e8e0d5" }}>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#a8a29e" }}>Travel Preferences</h2>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Preferred Currency</label>
            <select
              value={form.preferred_currency}
              onChange={e => setForm({...form, preferred_currency: e.target.value})}
              style={fieldStyle as any}
              onFocus={e => (e.target.style.borderColor = "#0d9488")}
              onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
            >
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Food Preference</label>
            <select
              value={form.food_preference}
              onChange={e => setForm({...form, food_preference: e.target.value})}
              style={fieldStyle as any}
              onFocus={e => (e.target.style.borderColor = "#0d9488")}
              onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
            >
              <option value="">Select preference</option>
              {FOOD_PREFS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Travel Style</label>
            <select
              value={form.travel_style}
              onChange={e => setForm({...form, travel_style: e.target.value})}
              style={fieldStyle as any}
              onFocus={e => (e.target.style.borderColor = "#0d9488")}
              onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
            >
              <option value="">Select style</option>
              {TRAVEL_STYLES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Favorite Categories</label>
            <input
              value={form.favorite_categories}
              onChange={e => setForm({...form, favorite_categories: e.target.value})}
              placeholder="museums, food, nature, architecture"
              style={fieldStyle as any}
              onFocus={e => (e.target.style.borderColor = "#0d9488")}
              onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-xs font-bold transition-all mt-2"
            style={{ background: saving ? "#a8a29e" : "#0d9488", color: "#ffffff" }}
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
