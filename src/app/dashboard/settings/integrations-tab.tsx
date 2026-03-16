"use client";

import { useState, useTransition } from "react";
import {
  Globe,
  Plus,
  Trash2,
  Loader2,
  Send,
  Check,
  Webhook,
} from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  saveSlackWebhook,
  testSlackWebhook,
  registerWebhook,
  deleteWebhook,
  type IntegrationSettings,
} from "@/lib/actions/integrations";

const WEBHOOK_EVENTS = [
  { id: "keyword.rank_changed", label: "Keyword Rank Changed" },
  { id: "audit.completed", label: "Audit Completed" },
  { id: "prediction.generated", label: "Prediction Generated" },
  { id: "backlink.new", label: "New Backlink" },
  { id: "backlink.lost", label: "Lost Backlink" },
];

interface IntegrationsTabProps {
  settings: IntegrationSettings;
}

export function IntegrationsTab({ settings }: IntegrationsTabProps) {
  const [slackUrl, setSlackUrl] = useState(settings.slackWebhookUrl ?? "");
  const [slackSaved, setSlackSaved] = useState(false);
  const [slackTested, setSlackTested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["keyword.rank_changed"]);
  const [webhooks, setWebhooks] = useState(settings.webhookEndpoints);

  function handleSaveSlack() {
    setError(null);
    setSlackSaved(false);
    startTransition(async () => {
      const result = await saveSlackWebhook(slackUrl);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSlackSaved(true);
        setTimeout(() => setSlackSaved(false), 3000);
      }
    });
  }

  function handleTestSlack() {
    setError(null);
    setSlackTested(false);
    startTransition(async () => {
      const result = await testSlackWebhook();
      if ("error" in result) {
        setError(result.error);
      } else {
        setSlackTested(true);
        setTimeout(() => setSlackTested(false), 3000);
      }
    });
  }

  function handleRegisterWebhook() {
    if (!webhookUrl.startsWith("https://")) {
      setError("Webhook URL must use HTTPS.");
      return;
    }
    if (webhookEvents.length === 0) {
      setError("Select at least one event.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await registerWebhook(webhookUrl, webhookEvents);
      if ("error" in result) {
        setError(result.error);
      } else {
        setWebhooks((prev) => [
          {
            id: crypto.randomUUID(),
            url: webhookUrl,
            events: webhookEvents,
            is_active: true,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        setShowAddWebhook(false);
        setWebhookUrl("");
        setWebhookEvents(["keyword.rank_changed"]);
      }
    });
  }

  function handleDeleteWebhook(id: string) {
    if (!confirm("Delete this webhook endpoint?")) return;
    startTransition(async () => {
      const result = await deleteWebhook(id);
      if ("error" in result) {
        setError(result.error);
      } else {
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
      }
    });
  }

  function toggleWebhookEvent(eventId: string) {
    setWebhookEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
          {error}
        </div>
      )}

      {/* Slack Integration */}
      <div>
        <ColumnHeader
          title="Slack Integration"
          subtitle="Receive SEO notifications directly in your Slack workspace"
        />
        <div className="mt-4 flex flex-col gap-4 border border-rule bg-surface-card p-5">
          <div className="flex items-center gap-3">
            <Input
              label="Slack Webhook URL"
              placeholder="https://hooks.slack.com/services/..."
              value={slackUrl}
              onChange={(e) => setSlackUrl(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSlack}
              disabled={!slackUrl || isPending}
            >
              {slackSaved ? <Check size={14} /> : <Globe size={14} />}
              {slackSaved ? "Saved" : "Save Webhook"}
            </Button>
            {settings.slackWebhookUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestSlack}
                disabled={isPending}
              >
                {slackTested ? <Check size={14} /> : <Send size={14} />}
                {slackTested ? "Sent!" : "Test"}
              </Button>
            )}
          </div>
          <p className="text-xs text-ink-muted">
            Create an incoming webhook in your Slack workspace settings, then paste the URL above.
            Notifications will be sent for rank changes, audit alerts, and more.
          </p>
        </div>
      </div>

      {/* Webhooks */}
      <div>
        <div className="flex items-end justify-between">
          <ColumnHeader
            title="Custom Webhooks"
            subtitle="Send event notifications to your own endpoints (Zapier, n8n, custom servers)"
          />
          <Button variant="primary" size="sm" onClick={() => setShowAddWebhook(true)}>
            <Plus size={14} />
            Add Webhook
          </Button>
        </div>

        {webhooks.length === 0 ? (
          <div className="mt-4 border border-dashed border-rule py-8 text-center">
            <Webhook size={24} className="mx-auto text-ink-muted" />
            <p className="mt-2 text-sm text-ink-muted">
              No webhooks configured. Add one to receive event notifications.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col">
            {webhooks.map((wh, i) => (
              <div
                key={wh.id}
                className={`flex items-start gap-4 py-4 ${
                  i < webhooks.length - 1 ? "border-b border-rule" : ""
                }`}
              >
                <Webhook size={16} className="mt-0.5 shrink-0 text-ink-muted" />
                <div className="flex-1">
                  <code className="font-mono text-xs text-ink">{wh.url}</code>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {wh.events.map((event) => (
                      <Badge key={event} variant="muted">{event}</Badge>
                    ))}
                  </div>
                  <span className="mt-1 block text-[10px] text-ink-muted">
                    Added {new Date(wh.created_at).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-ink-muted hover:text-editorial-red"
                  onClick={() => handleDeleteWebhook(wh.id)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zapier Section */}
      <div>
        <ColumnHeader
          title="Zapier / n8n / Make"
          subtitle="Connect to thousands of apps via automation platforms"
        />
        <div className="mt-4 border border-rule bg-surface-card p-5">
          <p className="text-sm text-ink-secondary">
            Use the custom webhook feature above to connect RankPulse AI with Zapier, n8n, or Make.
            Simply create a new webhook trigger in your automation platform and register the URL here.
          </p>
          <div className="mt-3 text-xs text-ink-muted">
            <strong>Supported events:</strong> keyword.rank_changed, audit.completed,
            prediction.generated, backlink.new, backlink.lost
          </div>
        </div>
      </div>

      {/* WordPress Section */}
      <div>
        <ColumnHeader
          title="WordPress"
          subtitle="Connect your WordPress site"
        />
        <div className="mt-4 border border-dashed border-rule bg-surface-card/50 p-5 text-center">
          <p className="text-sm text-ink-muted">
            WordPress integration coming soon. Use the REST API with your API key for programmatic access.
          </p>
        </div>
      </div>

      {/* Add Webhook Dialog */}
      <Dialog open={showAddWebhook} onOpenChange={setShowAddWebhook}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Webhook</DialogTitle>
            <DialogDescription>
              Add an HTTPS endpoint to receive event notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 p-5">
            <Input
              label="Webhook URL"
              placeholder="https://your-server.com/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Events
              </label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event.id}
                    className="flex cursor-pointer items-center gap-2 border border-rule px-3 py-2 text-xs hover:bg-surface-raised"
                  >
                    <input
                      type="checkbox"
                      checked={webhookEvents.includes(event.id)}
                      onChange={() => toggleWebhookEvent(event.id)}
                      className="accent-editorial-red"
                    />
                    {event.label}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter className="border-t-0 px-0 pb-0">
              <Button variant="secondary" size="md" onClick={() => setShowAddWebhook(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleRegisterWebhook}
                loading={isPending}
              >
                Register Webhook
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
