"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyTOTPLogin } from "@/lib/actions/two-fa";
import { signOut } from "@/lib/actions/auth";

export function Verify2FAForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;

    setError(null);
    startTransition(async () => {
      const result = await verifyTOTPLogin(code);
      if ("error" in result) {
        setError(result.error);
        setCode("");
        inputRef.current?.focus();
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center bg-editorial-red/10">
          <Shield size={28} className="text-editorial-red" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
            Two-Factor Verification
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Enter the 6-digit code from your Google Authenticator app
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-center text-sm text-editorial-red">
          {error}
        </div>
      )}

      {/* Code Input */}
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="w-48 border border-rule bg-surface-cream px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-ink placeholder:text-ink-muted/30 focus:border-editorial-red focus:outline-none dark:bg-surface-card"
          autoComplete="one-time-code"
          disabled={isPending}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={code.length !== 6 || isPending}
        >
          {isPending ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : null}
          Verify & Sign In
        </Button>
      </form>

      {/* Sign out link */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isPending}
          className="text-sm text-ink-muted transition-colors hover:text-editorial-red"
        >
          Use a different account
        </button>
      </div>
    </div>
  );
}
