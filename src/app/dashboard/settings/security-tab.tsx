"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Copy,
  Check,
  Smartphone,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  enrollTOTP,
  verifyAndActivateTOTP,
  unenrollTOTP,
  getMFAStatus,
} from "@/lib/actions/two-fa";

interface MFAFactor {
  id: string;
  friendlyName: string | null;
  status: string;
}

interface Props {
  initialEnabled: boolean;
  initialFactors: MFAFactor[];
}

export function SecurityTab({ initialEnabled, initialFactors }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [factors, setFactors] = useState(initialFactors);
  const [isPending, startTransition] = useTransition();

  // Setup flow state
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<"qr" | "verify">("qr");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  // Disable flow state
  const [showDisable, setShowDisable] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);

  // Focus code input when verify step shown
  useEffect(() => {
    if (setupStep === "verify" && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [setupStep]);

  // ── Enable 2FA: Start enrollment ───────────────────────────────
  function handleStartSetup() {
    setError(null);
    setShowSetup(true);
    setSetupStep("qr");
    setVerifyCode("");

    startTransition(async () => {
      const result = await enrollTOTP();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setFactorId(result.factorId);
    });
  }

  // ── Verify code during setup ───────────────────────────────────
  function handleVerifySetup() {
    setError(null);
    startTransition(async () => {
      const result = await verifyAndActivateTOTP(factorId, verifyCode);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEnabled(true);
      setShowSetup(false);
      // Refresh factors list
      const status = await getMFAStatus();
      setFactors(status.factors);
    });
  }

  // ── Disable 2FA ────────────────────────────────────────────────
  function handleDisable() {
    const verifiedFactor = factors.find((f) => f.status === "verified");
    if (!verifiedFactor) return;

    setError(null);
    startTransition(async () => {
      const result = await unenrollTOTP(verifiedFactor.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEnabled(false);
      setFactors([]);
      setShowDisable(false);
    });
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-rule pb-4">
        <h2 className="font-serif text-xl font-bold text-ink">Security</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Manage two-factor authentication for your account
        </p>
      </div>

      {/* 2FA Status Card */}
      <div className="border border-rule bg-surface-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 items-center justify-center ${enabled ? "bg-editorial-green/10" : "bg-ink-muted/10"}`}>
              {enabled ? (
                <ShieldCheck size={24} className="text-editorial-green" />
              ) : (
                <ShieldOff size={24} className="text-ink-muted" />
              )}
            </div>
            <div>
              <h3 className="font-sans text-base font-semibold text-ink">
                Two-Factor Authentication (2FA)
              </h3>
              <p className="mt-0.5 text-sm text-ink-secondary">
                {enabled
                  ? "Your account is protected with Google Authenticator. A 6-digit code is required on every login."
                  : "Add an extra layer of security by requiring a 6-digit code from Google Authenticator on every login."}
              </p>
              {enabled && (
                <p className="mt-2 inline-flex items-center gap-1.5 bg-editorial-green/10 px-2.5 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-editorial-green">
                  <ShieldCheck size={12} />
                  Active
                </p>
              )}
            </div>
          </div>
          <div>
            {enabled ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDisable(true)}
                disabled={isPending}
              >
                Disable 2FA
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartSetup}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                ) : (
                  <Shield size={14} className="mr-1.5" />
                )}
                Enable 2FA
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="border border-rule bg-surface-card p-6">
        <h4 className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          How It Works
        </h4>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-ink font-mono text-xs font-bold text-surface-cream">
              1
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Install App</p>
              <p className="mt-0.5 text-xs text-ink-secondary">
                Download Google Authenticator on your phone
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-ink font-mono text-xs font-bold text-surface-cream">
              2
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Scan QR Code</p>
              <p className="mt-0.5 text-xs text-ink-secondary">
                Scan the code we provide to link your account
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-ink font-mono text-xs font-bold text-surface-cream">
              3
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Enter Code</p>
              <p className="mt-0.5 text-xs text-ink-secondary">
                Use the 6-digit code from the app to verify
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Setup Dialog ──────────────────────────────────────────── */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {setupStep === "qr" ? "Set Up Two-Factor Authentication" : "Verify Your Code"}
            </DialogTitle>
            <DialogDescription>
              {setupStep === "qr"
                ? "Scan this QR code with Google Authenticator, then click Next."
                : "Enter the 6-digit code displayed in your authenticator app."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="border border-editorial-red/30 bg-editorial-red/5 px-3 py-2 text-sm text-editorial-red">
              {error}
            </div>
          )}

          {setupStep === "qr" && (
            <div className="flex flex-col items-center gap-4 py-4">
              {qrCode ? (
                <>
                  {/* QR Code */}
                  <div className="border border-rule bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCode}
                      alt="TOTP QR Code"
                      width={200}
                      height={200}
                    />
                  </div>

                  {/* Manual entry */}
                  <div className="w-full">
                    <p className="text-center text-xs text-ink-muted">
                      Or enter this key manually:
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 border border-rule bg-surface-cream px-3 py-2 text-center font-mono text-sm tracking-widest text-ink dark:bg-surface-card">
                        {secret}
                      </code>
                      <button
                        type="button"
                        onClick={copySecret}
                        className="border border-rule p-2 text-ink-muted transition-colors hover:text-ink"
                      >
                        {secretCopied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 py-8">
                  <Loader2 size={20} className="animate-spin text-ink-muted" />
                  <span className="text-sm text-ink-secondary">Generating QR code...</span>
                </div>
              )}
            </div>
          )}

          {setupStep === "verify" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Smartphone size={40} className="text-ink-muted" />
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-40 border border-rule bg-surface-card px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-ink placeholder:text-ink-muted/30 focus:border-editorial-red focus:outline-none"
                autoComplete="one-time-code"
              />
              <p className="text-xs text-ink-secondary">
                Enter the 6-digit code from Google Authenticator
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSetup(false)} disabled={isPending}>
              Cancel
            </Button>
            {setupStep === "qr" ? (
              <Button
                variant="primary"
                onClick={() => setSetupStep("verify")}
                disabled={!qrCode || isPending}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleVerifySetup}
                disabled={verifyCode.length !== 6 || isPending}
                loading={isPending}
              >
                Verify & Activate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Disable Confirmation Dialog ───────────────────────────── */}
      <Dialog open={showDisable} onOpenChange={setShowDisable}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication?</DialogTitle>
            <DialogDescription>
              This will remove the extra security layer from your account.
              You can re-enable it anytime.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-3 border border-editorial-gold/30 bg-editorial-gold/5 px-3 py-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-editorial-gold" />
            <p className="text-xs text-ink-secondary">
              Your account will only be protected by your password after disabling 2FA.
            </p>
          </div>

          {error && (
            <div className="border border-editorial-red/30 bg-editorial-red/5 px-3 py-2 text-sm text-editorial-red">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDisable(false)} disabled={isPending}>
              Keep 2FA
            </Button>
            <Button variant="danger" onClick={handleDisable} disabled={isPending} loading={isPending}>
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
