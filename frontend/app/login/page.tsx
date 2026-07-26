"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Compass } from "lucide-react";
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
      toast.error(err.response?.data?.detail || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    background: "#faf7f2",
    border: "1.5px solid #e8e0d5",
    color: "#1c1917",
    borderRadius: 12,
    padding: "11px 14px",
    width: "100%",
    fontSize: 14,
    fontWeight: 500,
    outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "#f5f0e8" }}>
      {/* Back link */}
      <Link href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm font-semibold transition-colors"
        style={{ color: "#78716c" }}>
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 justify-center mb-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#134e4a" }}>
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight" style={{ color: "#1c1917" }}>Voyager AI</span>
          </Link>
          <p className="text-sm font-medium mt-2" style={{ color: "#78716c" }}>
            {isSignup ? "Create your account to start planning." : "Sign in to continue your journey."}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8 space-y-4"
          style={{ background: "#ffffff", border: "1px solid #e8e0d5", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "#1c1917" }}>
            {isSignup ? "Create account" : "Welcome back"}
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Username</label>
                <input
                  {...register("username")}
                  type="text"
                  placeholder="e.g. alex_travels"
                  style={fieldStyle as any}
                  onFocus={e => (e.target.style.borderColor = "#0d9488")}
                  onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Email</label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                style={fieldStyle as any}
                onFocus={e => (e.target.style.borderColor = "#0d9488")}
                onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
              />
              {errors.email && <p className="text-xs mt-1 font-medium" style={{ color: "#dc2626" }}>{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "#44403c" }}>Password</label>
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                style={fieldStyle as any}
                onFocus={e => (e.target.style.borderColor = "#0d9488")}
                onBlur={e => (e.target.style.borderColor = "#e8e0d5")}
              />
              {errors.password && <p className="text-xs mt-1 font-medium" style={{ color: "#dc2626" }}>{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all mt-2"
              style={{
                background: loading ? "#a8a29e" : "#0d9488",
                color: "#ffffff",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 3px 12px rgba(13,148,136,0.3)",
              }}>
              {loading ? "Please wait…" : isSignup ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm font-medium pt-1" style={{ color: "#78716c" }}>
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="font-bold"
              style={{ color: "#0d9488" }}>
              {isSignup ? "Sign in" : "Sign up free"}
            </button>
          </p>
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
