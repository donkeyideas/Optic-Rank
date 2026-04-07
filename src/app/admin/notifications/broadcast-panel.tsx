"use client";

import { useState, useTransition } from "react";
import { Send, Sparkles, Loader2, Radio, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  sendBroadcast,
  generateBroadcastContent,
  getBroadcastHistory,
  type BroadcastHistoryEntry,
} from "@/lib/actions/broadcast";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BroadcastPanel({
  initialHistory,
}: {
  initialHistory: BroadcastHistoryEntry[];
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    diagnostics?: { usersNotified: number; pushDelivered: number; pushFailed: number };
  } | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastHistoryEntry[]>(initialHistory);

  function handleSend() {
    if (!title.trim() || !body.trim()) return;
    setResult(null);

    startTransition(async () => {
      const res = await sendBroadcast(title.trim(), body.trim(), actionUrl.trim() || undefined);
      if ("error" in res) {
        setResult({ success: false, message: res.error });
      } else {
        setResult({
          success: true,
          message: `Broadcast sent to ${res.diagnostics.usersNotified} users`,
          diagnostics: res.diagnostics,
        });
        setTitle("");
        setBody("");
        setActionUrl("");
        // Refresh history
        const updated = await getBroadcastHistory();
        setBroadcasts(updated);
      }
    });
  }

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const res = await generateBroadcastContent();
      if ("error" in res) {
        setResult({ success: false, message: res.error });
      } else {
        setTitle(res.title);
        setBody(res.body);
      }
    } catch {
      setResult({ success: false, message: "Generation failed" });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Compose */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Send System Broadcast
          </h3>
          <p className="mb-4 text-xs text-ink-secondary">
            Send an in-app notification + push notification to all users across the platform.
          </p>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-ink">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title..."
                className="w-full border border-rule bg-surface-cream px-3 py-2 font-sans text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none dark:bg-ink/5"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-ink">
                Message
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Notification body..."
                rows={3}
                className="w-full resize-y border border-rule bg-surface-cream px-3 py-2 font-sans text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none dark:bg-ink/5"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-ink">
                Action URL{" "}
                <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                type="text"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="/dashboard"
                className="w-full border border-rule bg-surface-cream px-3 py-2 font-sans text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none dark:bg-ink/5"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || isPending}
                className="flex items-center gap-2 border border-rule px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink-secondary transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                {isGenerating ? "Generating..." : "Generate with AI"}
              </button>

              <button
                onClick={handleSend}
                disabled={isPending || !title.trim() || !body.trim()}
                className="flex items-center gap-2 border border-editorial-red bg-editorial-red px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-editorial-red/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={12} />
                {isPending ? "Sending..." : "Send Broadcast"}
              </button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div
              className={`mt-4 border p-3 ${
                result.success
                  ? "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"
                  : "border-editorial-red/30 bg-editorial-red/5 text-editorial-red"
              }`}
            >
              <p className="text-[13px] font-semibold">{result.message}</p>
              {result.diagnostics && (
                <div className="mt-1 space-y-0.5 text-[11px] opacity-80">
                  <p>Users notified: {result.diagnostics.usersNotified}</p>
                  <p>Push delivered: {result.diagnostics.pushDelivered}</p>
                  {result.diagnostics.pushFailed > 0 && (
                    <p>Push failed: {result.diagnostics.pushFailed}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Broadcast History */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Broadcast History
          </span>
          <div className="h-px flex-1 bg-rule" />
          <span className="font-mono text-[10px] text-ink-muted">
            {broadcasts.length} broadcasts
          </span>
        </div>

        {broadcasts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Radio
                size={24}
                strokeWidth={1.5}
                className="mx-auto mb-2 text-ink-muted"
              />
              <p className="text-sm text-ink-muted">No broadcasts sent yet.</p>
              <p className="mt-0.5 text-xs text-ink-faint">
                Use the form above to send your first broadcast.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-rule">
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Title
                  </th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Message
                  </th>
                  <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Sent To
                  </th>
                  <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Read
                  </th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((b, i) => (
                  <tr
                    key={i}
                    className="border-b border-rule transition-colors hover:bg-surface-raised"
                  >
                    <td className="max-w-[200px] px-3 py-2.5">
                      <p className="truncate font-sans text-[13px] font-medium text-ink">
                        {b.title}
                      </p>
                    </td>
                    <td className="max-w-[280px] px-3 py-2.5">
                      <p className="line-clamp-1 text-[12px] text-ink-secondary">
                        {b.message}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] text-ink">
                      {b.recipients}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] text-ink-muted">
                      {b.readCount}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-ink-muted">
                        <Clock size={10} />
                        <span className="font-mono text-[10px]">
                          {new Date(b.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "2-digit",
                          })}{" "}
                          {new Date(b.createdAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
