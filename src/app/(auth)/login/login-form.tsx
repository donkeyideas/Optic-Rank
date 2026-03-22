"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get("message");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    startTransition(async () => {
      const result = await signIn(formData);
      if (result && "requires2FA" in result) {
        router.push("/verify-2fa");
        return;
      }
      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  async function handleOAuth(provider: "google") {
    setError(null);
    setOauthLoading(provider);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setOauthLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          Welcome Back
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Sign in to your Optic Rank account
        </p>
      </div>

      {/* URL Message */}
      {message && (
        <div className="border border-editorial-green/30 bg-editorial-green/5 px-4 py-3 text-center text-sm text-editorial-green">
          {message}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-center text-sm text-editorial-red">
          {error}
        </div>
      )}

      {/* OAuth Buttons */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={isPending || oauthLoading !== null}
          className="flex h-10 w-full items-center justify-center gap-2 border border-rule bg-surface-card text-sm font-medium text-ink transition-colors hover:bg-surface-raised disabled:pointer-events-none disabled:opacity-50"
        >
          {oauthLoading === "google" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-muted border-t-transparent" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          Continue with Google
        </button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-rule" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-surface-card px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
            Or sign in with email
          </span>
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          name="email"
          type="email"
          label="Email Address"
          placeholder="you@company.com"
          prefixIcon={<Mail />}
          required
          autoComplete="email"
        />

        <div className="relative">
          <Input
            name="password"
            type={showPassword ? "text" : "password"}
            label="Password"
            placeholder="Enter your password"
            prefixIcon={<Lock />}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[34px] text-ink-muted transition-colors hover:text-ink-secondary"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-ink-secondary">
            <input type="checkbox" className="h-4 w-4 border border-rule accent-editorial-red" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-editorial-red transition-colors hover:text-editorial-red/80">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" loading={isPending} className="w-full">
          Sign In
        </Button>
      </form>

      <p className="text-center text-sm text-ink-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-editorial-red transition-colors hover:text-editorial-red/80">
          Create one
        </Link>
      </p>
    </div>
  );
}
