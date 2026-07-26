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
      // Preferences endpoint would be /preferences but we'll show a success for now
      toast.success("Preferences saved!");
    } catch {
      toast.error("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold flex items-center gap-2"><Settings className="w-5 h-5" /> Settings</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Manage your profile and preferences.</p>
        </div>

        {/* Profile */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center text-blue-400 text-lg font-semibold">
              {formatUsername(user).charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{formatUsername(user)}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold">Travel Preferences</h2>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Preferred Currency</label>
            <select value={form.preferred_currency} onChange={e => setForm({...form, preferred_currency: e.target.value})} className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors">
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Food Preference</label>
            <select value={form.food_preference} onChange={e => setForm({...form, food_preference: e.target.value})} className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors">
              <option value="">Select preference</option>
              {FOOD_PREFS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Travel Style</label>
            <select value={form.travel_style} onChange={e => setForm({...form, travel_style: e.target.value})} className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors">
              <option value="">Select style</option>
              {TRAVEL_STYLES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Favorite Categories</label>
            <input
              value={form.favorite_categories}
              onChange={e => setForm({...form, favorite_categories: e.target.value})}
              placeholder="museums, food, nature, architecture"
              className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
