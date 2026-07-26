"use client";

import AppLayout from "@/components/AppLayout";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { tripService } from "@/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Map } from "lucide-react";

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

export default function NewTripPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: "USD" },
  });

  const interests = watch("interests") || "";

  const mutation = useMutation({
    mutationFn: (data: FormData) => tripService.createTrip({ ...data, budget: parseFloat(data.budget) }),
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip created!");
      router.push(`/trips/${trip.id}`);
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

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Create a Trip</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Tell us about your trip and we'll set everything up.</p>
        </div>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 space-y-5">
            {/* Destination */}
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Destination *</label>
              <input
                {...register("destination")}
                placeholder="Tokyo, Japan"
                className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
              />
              {errors.destination && <p className="text-xs text-red-400 mt-1">{errors.destination.message}</p>}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Start Date *</label>
                <input
                  {...register("start_date")}
                  type="date"
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                />
                {errors.start_date && <p className="text-xs text-red-400 mt-1">{errors.start_date.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">End Date *</label>
                <input
                  {...register("end_date")}
                  type="date"
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                />
                {errors.end_date && <p className="text-xs text-red-400 mt-1">{errors.end_date.message}</p>}
              </div>
            </div>

            {/* Budget & Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Budget *</label>
                <input
                  {...register("budget")}
                  type="number"
                  placeholder="2000"
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                />
                {errors.budget && <p className="text-xs text-red-400 mt-1">{errors.budget.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Currency</label>
                <select
                  {...register("currency")}
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Interests *</label>
              <input
                {...register("interests")}
                placeholder="food, culture, museums"
                className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
              />
              {errors.interests && <p className="text-xs text-red-400 mt-1">{errors.interests.message}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {INTEREST_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addInterest(s)}
                    className="text-[10px] px-2 py-1 rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white hover:border-white/20 transition-colors"
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
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-medium transition-colors"
          >
            <Map className="w-4 h-4" />
            {mutation.isPending ? "Creating Trip..." : "Create Trip"}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
