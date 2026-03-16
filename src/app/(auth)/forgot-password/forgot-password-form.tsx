"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/lib/actions/auth";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    startTransition(async () => {
      const result = await resetPassword(formData);
      if (result && "error" in result) {
        setError(result.error);
      } else if (result && "success" in result) {
        setSubmitted(true);
      }
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Success Icon */}
        <div className="flex h-16 w-16 items-center justify-center border-2 border-editorial-green bg-editorial-green/10">
          <Mail size={28} strokeWidth={1.5} className="text-editorial-green" />
        </div>

        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
            Check Your Email
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            We&apos;ve sent a password reset link to your email address. Please
            check your inbox and follow the instructions to reset your password.
          </p>
        </div>

        <p className="text-xs text-ink-muted">
          Didn&apos;t receive the email? Check your spam folder or{" "}
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setError(null);
            }}
            className="font-medium text-editorial-red hover:text-editorial-red/80"
          >
            try again
          </button>
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          Reset Your Password
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-center text-sm text-editorial-red">
          {error}
        </div>
      )}

      {/* Reset Form */}
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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isPending}
          className="w-full"
        >
          Send Reset Link
        </Button>
      </form>

      {/* Back to Login */}
      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
