"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plane, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(searchParams.get("tab") === "signup");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = isSignup
        ? await authService.signup(data.email, data.password, data.username)
        : await authService.login(data.email, data.password);
      authService.saveSession(res);
      toast.success(isSignup ? "Account created!" : "Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Something went wrong.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[hsl(var(--background))] relative">
      {/* Back Arrow Button */}
      <Link
        href="/"
        aria-label="Back to home"
        className="absolute top-6 left-6 p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[hsl(var(--muted-foreground))] hover:text-white transition-all group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      </Link>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-base">Voyager AI</span>
        </Link>

        {/* Card */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-7">
          <h1 className="text-lg font-semibold mb-1">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
            {isSignup ? "Start planning your perfect trip." : "Sign in to continue your journey."}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Username</label>
                <input
                  {...register("username")}
                  type="text"
                  placeholder="Choose a username"
                  className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Email</label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-[hsl(var(--muted-foreground))]">Password</label>
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
              />
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-[hsl(var(--muted-foreground))]">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignup(!isSignup)} className="text-blue-400 hover:text-blue-300 font-medium">
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
