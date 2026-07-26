"use client";

import AppLayout from "@/components/AppLayout";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { tripService } from "@/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Map, Sparkles } from "lucide-react";
import { Suspense, useEffect } from "react";

const schema = z.object({
  destination: z.string().min(2, "Enter a destination"),
  start_date: z.string().min(1, "Enter start date"),
  end_date: z.string().min(1, "Enter end date"),
  budget: z.string().min(1, "Enter a budget"),
  currency: z.string().min(1, "Choose currency"),
  interests: z.string().min(2, "Enter at least one interest"),
});
type FormData = z.infer<typeof schema>;

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "INR", "AUD", "CAD", "SGD"];
const INTEREST_SUGGESTIONS = ["Food & Cuisine", "History", "Architecture", "Nature", "Art", "Shopping", "Adventure", "Nightlife"];

function NewTripForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const paramDest = searchParams.get("destination") || "";
  const paramBudget = searchParams.get("budget") || "";
  const paramInterests = searchParams.get("interests") || "";
  const paramPrompt = searchParams.get("prompt") || "";
  const paramDays = parseInt(searchParams.get("days") || "4", 10);

  // Default dates calculated from today
  const todayStr = new Date().toISOString().split("T")[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (isNaN(paramDays) ? 4 : paramDays));
  const endDateStr = endDate.toISOString().split("T")[0];

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      destination: paramDest,
      budget: paramBudget || "2000",
      currency: "USD",
      interests: paramInterests,
      start_date: todayStr,
      end_date: endDateStr,
    },
  });

  useEffect(() => {
    if (paramDest) setValue("destination", paramDest);
    if (paramBudget) setValue("budget", paramBudget);
    if (paramInterests) setValue("interests", paramInterests);
  }, [paramDest, paramBudget, paramInterests, setValue]);

  const interests = watch("interests") || "";

  const mutation = useMutation({
    mutationFn: (data: FormData) => tripService.createTrip({ ...data, budget: parseFloat(data.budget) }),
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success(`Trip for ${trip.destination} created!`);
      const targetUrl = paramPrompt
        ? `/trips/${trip.id}?prompt=${encodeURIComponent(paramPrompt)}`
        : `/trips/${trip.id}`;
      router.push(targetUrl);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to create trip.");
    },
  });

  const addInterest = (interest: string) => {
    const current = interests ? interests.split(",").map(s => s.trim()).filter(Boolean) : [];
    if (!current.includes(interest)) {
      setValue("interests", [...current, interest].join(", "));
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
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: "#1c1917" }}>
          Create a New Trip
        </h1>
        <p className="text-xs font-medium mt-0.5" style={{ color: "#78716c" }}>
          Select your dates and budget to customize your itinerary context.
        </p>
      </div>

      {paramPrompt && (
        <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#0d9488" } as any} />
          <div>
            <p className="text-xs font-bold" style={{ color: "#166534" }}>Trip Suggestion Pre-loaded</p>
            <p className="text-xs mt-0.5" style={{ color: "#15803d" }}>"{paramPrompt}"</p>
            <p className="text-[11px] font-medium mt-1" style={{ color: "#166534", opacity: 0.8 }}>Choose your dates below before launching Voyager AI.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
        <div className="rounded-3xl p-7 space-y-5" style={{ background: "#ffffff", border: "1px solid #e8e0d5" }}>
          {/* Destination */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Destination *</label>
            <input
              {...register("destination")}
              placeholder="Tokyo, Japan"
              style={fieldStyle as any}
              onFocus={e => (e.target.style.borderColor = "#0d9488")}
              onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
            />
            {errors.destination && <p className="text-xs mt-1 font-medium" style={{ color: "#dc2626" }}>{errors.destination.message}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Start Date *</label>
              <input
                {...register("start_date")}
                type="date"
                style={fieldStyle as any}
                onFocus={e => (e.target.style.borderColor = "#0d9488")}
                onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
              />
              {errors.start_date && <p className="text-xs mt-1 font-medium" style={{ color: "#dc2626" }}>{errors.start_date.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>End Date *</label>
              <input
                {...register("end_date")}
                type="date"
                style={fieldStyle as any}
                onFocus={e => (e.target.style.borderColor = "#0d9488")}
                onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
              />
              {errors.end_date && <p className="text-xs mt-1 font-medium" style={{ color: "#dc2626" }}>{errors.end_date.message}</p>}
            </div>
          </div>

          {/* Budget & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Budget *</label>
              <input
                {...register("budget")}
                type="number"
                placeholder="2000"
                style={fieldStyle as any}
                onFocus={e => (e.target.style.borderColor = "#0d9488")}
                onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
              />
              {errors.budget && <p className="text-xs mt-1 font-medium" style={{ color: "#dc2626" }}>{errors.budget.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Currency</label>
              <select
                {...register("currency")}
                style={fieldStyle as any}
                onFocus={e => (e.target.style.borderColor = "#0d9488")}
                onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Interests *</label>
            <input
              {...register("interests")}
              placeholder="food, culture, museums"
              style={fieldStyle as any}
              onFocus={e => (e.target.style.borderColor = "#0d9488")}
              onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
            />
            {errors.interests && <p className="text-xs mt-1 font-medium" style={{ color: "#dc2626" }}>{errors.interests.message}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {INTEREST_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addInterest(s)}
                  className="text-[11px] px-2.5 py-1 rounded-xl font-medium transition-all"
                  style={{ background: "#f5f0e8", border: "1px solid #e8e0d5", color: "#57534e" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.borderColor = "#bbf7d0"; e.currentTarget.style.color = "#0d9488"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#f5f0e8"; e.currentTarget.style.borderColor = "#e8e0d5"; e.currentTarget.style.color = "#57534e"; }}
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold transition-all shadow-sm"
          style={{ background: mutation.isPending ? "#a8a29e" : "#0d9488", color: "#ffffff" }}
        >
          <Map className="w-4 h-4" />
          {mutation.isPending ? "Creating Trip..." : "Create Trip and Start Planning"}
        </button>
      </form>
    </div>
  );
}

export default function NewTripPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="text-xs p-6" style={{ color: "#a8a29e" }}>Loading...</div>}>
        <NewTripForm />
      </Suspense>
    </AppLayout>
  );
}
