"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Globe,
  Plus,
  Trash2,
  Send,
  Check,
  Webhook,
  BarChart3,
  AlertTriangle,
  Unlink,
  ChevronDown,
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
  saveTeamsWebhook,
  testTeamsWebhook,
  registerWebhook,
  deleteWebhook,
  type IntegrationSettings,
} from "@/lib/actions/integrations";
import {
  disconnectGA4,
  listGA4Properties,
  selectGA4Property,
  testGA4Connection,
} from "@/lib/actions/ga4-import";
import {
  disconnectGSC,
  listGSCProperties,
  setGSCProperty,
  testGSCConnection,
} from "@/lib/actions/gsc";
import type { GA4PropertySummary } from "@/lib/google/oauth";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";

const WEBHOOK_EVENTS = [
  { id: "keyword.rank_changed", label: "Keyword Rank Changed" },
  { id: "audit.completed", label: "Audit Completed" },
  { id: "prediction.generated", label: "Prediction Generated" },
  { id: "backlink.new", label: "New Backlink" },
  { id: "backlink.lost", label: "Lost Backlink" },
];

interface IntegrationsTabProps {
  settings: IntegrationSettings;
  projectId?: string;
  ga4Connected?: boolean;
  ga4GoogleEmail?: string | null;
  ga4PropertyId?: string | null;
  ga4OAuthConfigured?: boolean;
  gscConnected?: boolean;
  gscPropertyUrl?: string | null;
  gscOAuthConfigured?: boolean;
}

export function IntegrationsTab({
  settings,
  projectId,
  ga4Connected = false,
  ga4GoogleEmail,
  ga4PropertyId: initialGa4PropertyId,
  ga4OAuthConfigured = false,
  gscConnected = false,
  gscPropertyUrl: initialGscPropertyUrl,
  gscOAuthConfigured = false,
}: IntegrationsTabProps) {
  const timezone = useTimezone();
  const searchParams = useSearchParams();
  const [slackUrl, setSlackUrl] = useState(settings.slackWebhookUrl ?? "");
  const [slackSaved, setSlackSaved] = useState(false);
  const [slackTested, setSlackTested] = useState(false);
  const [teamsUrl, setTeamsUrl] = useState(settings.teamsWebhookUrl ?? "");
  const [teamsSaved, setTeamsSaved] = useState(false);
  const [teamsTested, setTeamsTested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // GA4 OAuth state
  const [ga4IsConnected, setGa4IsConnected] = useState(ga4Connected);
  const [ga4Email, setGa4Email] = useState(ga4GoogleEmail);
  const [ga4Properties, setGa4Properties] = useState<GA4PropertySummary[]>([]);
  const [ga4PropertiesLoading, setGa4PropertiesLoading] = useState(false);
  const [ga4SelectedProperty, setGa4SelectedProperty] = useState(initialGa4PropertyId ?? "");
  const [ga4TestStatus, setGa4TestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [ga4TestMessage, setGa4TestMessage] = useState<string | null>(null);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);

  // GSC OAuth state
  const [gscIsConnected, setGscIsConnected] = useState(gscConnected);
  const [gscProperties, setGscProperties] = useState<Array<{ siteUrl: string; permissionLevel: string }>>([]);
  const [gscPropertiesLoading, setGscPropertiesLoading] = useState(false);
  const [gscSelectedProperty, setGscSelectedProperty] = useState(initialGscPropertyUrl ?? "");
  const [gscTestStatus, setGscTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [gscTestMessage, setGscTestMessage] = useState<string | null>(null);
  const [showGscPropertyPicker, setShowGscPropertyPicker] = useState(false);

  // Handle OAuth callback success/error from URL params
  useEffect(() => {
    const ga4Success = searchParams.get("ga4_success");
    const ga4Error = searchParams.get("ga4_error");
    const gscSuccess = searchParams.get("gsc_success");
    const gscError = searchParams.get("gsc_error");
    if (ga4Success) {
      setGa4IsConnected(true);
    } else if (ga4Error) {
      setError(`Google Analytics connection failed: ${ga4Error}`);
    }
    if (gscSuccess) {
      setGscIsConnected(true);
    } else if (gscError) {
      setError(`Google Search Console connection failed: ${gscError}`);
    }
  }, [searchParams]);

  // Auto-load properties when connected
  useEffect(() => {
    if (ga4IsConnected && projectId && ga4Properties.length === 0) {
      loadGA4Properties();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ga4IsConnected, projectId]);

  useEffect(() => {
    if (gscIsConnected && projectId && gscProperties.length === 0) {
      loadGSCProperties();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gscIsConnected, projectId]);

  function loadGA4Properties() {
    if (!projectId) return;
    setGa4PropertiesLoading(true);
    startTransition(async () => {
      const result = await listGA4Properties(projectId);
      setGa4PropertiesLoading(false);
      if ("error" in result) {
        setError(result.error);
      } else {
        setGa4Properties(result.properties);
      }
    });
  }

  function handleSelectProperty(propertyId: string) {
    if (!projectId) return;
    setGa4SelectedProperty(propertyId);
    setShowPropertyPicker(false);
    setGa4TestStatus("idle");
    setGa4TestMessage(null);
    startTransition(async () => {
      const result = await selectGA4Property(projectId, propertyId);
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  function handleDisconnectGA4() {
    if (!projectId || !confirm("Disconnect Google Analytics? You can reconnect anytime.")) return;
    startTransition(async () => {
      const result = await disconnectGA4(projectId);
      if ("error" in result) {
        setError(result.error);
      } else {
        setGa4IsConnected(false);
        setGa4Email(null);
        setGa4Properties([]);
        setGa4SelectedProperty("");
        setGa4TestStatus("idle");
        setGa4TestMessage(null);
      }
    });
  }

  function handleTestGA4() {
    if (!projectId) return;
    setGa4TestStatus("testing");
    setGa4TestMessage(null);
    startTransition(async () => {
      const result = await testGA4Connection(projectId);
      if ("error" in result) {
        setGa4TestStatus("error");
        setGa4TestMessage(result.error);
      } else {
        setGa4TestStatus("success");
        setGa4TestMessage(
          `Connection verified! ${result.totalSessions.toLocaleString()} sessions in the last 7 days.`
        );
      }
    });
  }

  // GSC handlers
  function loadGSCProperties() {
    if (!projectId) return;
    setGscPropertiesLoading(true);
    startTransition(async () => {
      const result = await listGSCProperties(projectId);
      setGscPropertiesLoading(false);
      if ("error" in result) {
        setError(result.error);
      } else {
        setGscProperties(result.properties);
      }
    });
  }

  function handleSelectGSCProperty(propertyUrl: string) {
    if (!projectId) return;
    setGscSelectedProperty(propertyUrl);
    setShowGscPropertyPicker(false);
    setGscTestStatus("idle");
    setGscTestMessage(null);
    startTransition(async () => {
      const result = await setGSCProperty(projectId, propertyUrl);
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  function handleDisconnectGSC() {
    if (!projectId || !confirm("Disconnect Google Search Console? You can reconnect anytime.")) return;
    startTransition(async () => {
      const result = await disconnectGSC(projectId);
      if ("error" in result) {
        setError(result.error);
      } else {
        setGscIsConnected(false);
        setGscProperties([]);
        setGscSelectedProperty("");
        setGscTestStatus("idle");
        setGscTestMessage(null);
      }
    });
  }

  function handleTestGSC() {
    if (!projectId) return;
    setGscTestStatus("testing");
    setGscTestMessage(null);
    startTransition(async () => {
      const result = await testGSCConnection(projectId);
      if ("error" in result) {
        setGscTestStatus("error");
        setGscTestMessage(result.error);
      } else {
        setGscTestStatus("success");
        setGscTestMessage(
          `Connection verified! ${result.totalClicks.toLocaleString()} clicks, ${result.totalImpressions.toLocaleString()} impressions in the last 7 days.`
        );
      }
    });
  }

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

  function handleSaveTeams() {
    setError(null);
    setTeamsSaved(false);
    startTransition(async () => {
      const result = await saveTeamsWebhook(teamsUrl);
      if ("error" in result) {
        setError(result.error);
      } else {
        setTeamsSaved(true);
        setTimeout(() => setTeamsSaved(false), 3000);
      }
    });
  }

  function handleTestTeams() {
    setError(null);
    setTeamsTested(false);
    startTransition(async () => {
      const result = await testTeamsWebhook();
      if ("error" in result) {
        setError(result.error);
      } else {
        setTeamsTested(true);
        setTimeout(() => setTeamsTested(false), 3000);
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

      {/* Google Analytics 4 */}
      <div>
        <ColumnHeader
          title="Google Analytics 4"
          subtitle="Connect your Google account to import analytics data"
        />
        <div className="mt-4 flex flex-col gap-4 border border-rule bg-surface-card p-5">
          {/* Status indicator */}
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center border ${
              ga4IsConnected
                ? ga4SelectedProperty
                  ? "border-editorial-green/30 bg-editorial-green/10"
                  : "border-editorial-gold/30 bg-editorial-gold/10"
                : "border-rule bg-surface-raised"
            }`}>
              <BarChart3 size={14} className={
                ga4IsConnected
                  ? ga4SelectedProperty ? "text-editorial-green" : "text-editorial-gold"
                  : "text-ink-muted"
              } />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">
                {ga4IsConnected
                  ? ga4SelectedProperty
                    ? "Connected"
                    : "Connected — Select a Property"
                  : "Not Connected"}
              </p>
              <p className="text-xs text-ink-muted">
                {ga4IsConnected
                  ? ga4Email
                    ? `Signed in as ${ga4Email}`
                    : "Google account linked"
                  : "Click below to connect with your Google account"}
              </p>
            </div>
            {ga4IsConnected && (
              <Button
                variant="ghost"
                size="sm"
                className="text-ink-muted hover:text-editorial-red"
                onClick={handleDisconnectGA4}
                disabled={isPending}
              >
                <Unlink size={14} />
                Disconnect
              </Button>
            )}
          </div>

          {/* Not connected: show Connect button */}
          {!ga4IsConnected && (
            <div className="flex flex-col gap-3">
              {ga4OAuthConfigured ? (
                <>
                  {projectId ? (
                    <a
                      href={`/api/auth/ga4?project_id=${projectId}`}
                      className="inline-flex h-10 items-center justify-center gap-2 border border-rule bg-surface-raised px-5 text-sm font-semibold text-ink hover:bg-surface-card"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Connect Google Analytics
                    </a>
                  ) : (
                    <p className="text-xs text-ink-muted">
                      Create a project first to connect Google Analytics.
                    </p>
                  )}
                  <p className="text-[11px] text-ink-muted">
                    Grants read-only access to your analytics data. You can disconnect anytime.
                  </p>
                </>
              ) : (
                <div className="flex items-start gap-3 border border-editorial-gold/30 bg-editorial-gold/5 px-4 py-3">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-editorial-gold" />
                  <div className="text-sm text-ink-secondary">
                    <p className="font-semibold text-ink">Google OAuth Not Configured (Admin)</p>
                    <p className="mt-1">
                      Set <code className="bg-surface-raised px-1 py-0.5 font-mono text-[10px]">GOOGLE_OAUTH_CLIENT_ID</code> and <code className="bg-surface-raised px-1 py-0.5 font-mono text-[10px]">GOOGLE_OAUTH_CLIENT_SECRET</code> environment variables to enable Google Analytics integration.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Connected: show property picker */}
          {ga4IsConnected && (
            <div className="flex flex-col gap-3">
              <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Select GA4 Property
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowPropertyPicker(!showPropertyPicker);
                    if (ga4Properties.length === 0) loadGA4Properties();
                  }}
                  className="flex h-10 w-full items-center justify-between border border-rule bg-surface-card px-3 text-sm text-ink hover:bg-surface-raised"
                >
                  <span className={ga4SelectedProperty ? "font-mono" : "text-ink-muted"}>
                    {ga4SelectedProperty
                      ? (() => {
                          const match = ga4Properties.find((p) => p.propertyId === ga4SelectedProperty);
                          return match
                            ? `${match.displayName} (${match.propertyId})`
                            : `Property ${ga4SelectedProperty}`;
                        })()
                      : "Choose a property..."}
                  </span>
                  <ChevronDown size={14} className="text-ink-muted" />
                </button>
                {showPropertyPicker && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto border border-rule bg-surface-card shadow-lg">
                    {ga4PropertiesLoading ? (
                      <div className="flex items-center gap-2 px-4 py-3 text-sm text-ink-muted">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-muted border-t-transparent" />
                        Loading properties...
                      </div>
                    ) : ga4Properties.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-ink-muted">
                        No GA4 properties found. Make sure your Google account has access to at least one GA4 property.
                      </div>
                    ) : (
                      ga4Properties.map((prop) => (
                        <button
                          key={prop.propertyId}
                          type="button"
                          onClick={() => handleSelectProperty(prop.propertyId)}
                          className={`flex w-full flex-col px-4 py-2.5 text-left hover:bg-surface-raised ${
                            ga4SelectedProperty === prop.propertyId ? "bg-surface-raised" : ""
                          }`}
                        >
                          <span className="text-sm font-medium text-ink">
                            {prop.displayName}
                            {ga4SelectedProperty === prop.propertyId && (
                              <Check size={12} className="ml-2 inline text-editorial-green" />
                            )}
                          </span>
                          <span className="text-[11px] text-ink-muted">
                            {prop.accountName} &middot; {prop.propertyId}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Test connection */}
              {ga4SelectedProperty && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending || ga4TestStatus === "testing"}
                    onClick={handleTestGA4}
                  >
                    {ga4TestStatus === "testing" ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-muted border-t-transparent" />
                    ) : ga4TestStatus === "success" ? (
                      <Check size={14} className="text-editorial-green" />
                    ) : (
                      <BarChart3 size={14} />
                    )}
                    {ga4TestStatus === "testing" ? "Testing..." : "Test Connection"}
                  </Button>
                  {ga4TestStatus === "success" && ga4TestMessage && (
                    <span className="text-xs text-editorial-green">{ga4TestMessage}</span>
                  )}
                </div>
              )}
              {ga4TestStatus === "error" && ga4TestMessage && (
                <div className="flex items-start gap-2 border border-editorial-red/30 bg-editorial-red/5 px-4 py-3">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-editorial-red" />
                  <p className="text-sm text-editorial-red">{ga4TestMessage}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Google Search Console */}
      <div>
        <ColumnHeader
          title="Google Search Console"
          subtitle="Connect your Google account to import search performance data"
        />
        <div className="mt-4 flex flex-col gap-4 border border-rule bg-surface-card p-5">
          {/* Status indicator */}
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center border ${
              gscIsConnected
                ? gscSelectedProperty
                  ? "border-editorial-green/30 bg-editorial-green/10"
                  : "border-editorial-gold/30 bg-editorial-gold/10"
                : "border-rule bg-surface-raised"
            }`}>
              <Globe size={14} className={
                gscIsConnected
                  ? gscSelectedProperty ? "text-editorial-green" : "text-editorial-gold"
                  : "text-ink-muted"
              } />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">
                {gscIsConnected
                  ? gscSelectedProperty
                    ? "Connected"
                    : "Connected — Select a Property"
                  : "Not Connected"}
              </p>
              <p className="text-xs text-ink-muted">
                {gscIsConnected
                  ? gscSelectedProperty
                    ? `Property: ${gscSelectedProperty}`
                    : "Google account linked"
                  : "Click below to connect with your Google account"}
              </p>
            </div>
            {gscIsConnected && (
              <Button
                variant="ghost"
                size="sm"
                className="text-ink-muted hover:text-editorial-red"
                onClick={handleDisconnectGSC}
                disabled={isPending}
              >
                <Unlink size={14} />
                Disconnect
              </Button>
            )}
          </div>

          {/* Not connected: show Connect button */}
          {!gscIsConnected && (
            <div className="flex flex-col gap-3">
              {gscOAuthConfigured ? (
                <>
                  {projectId ? (
                    <a
                      href={`/api/auth/gsc?project_id=${projectId}`}
                      className="inline-flex h-10 items-center justify-center gap-2 border border-rule bg-surface-raised px-5 text-sm font-semibold text-ink hover:bg-surface-card"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Connect Google Search Console
                    </a>
                  ) : (
                    <p className="text-xs text-ink-muted">
                      Create a project first to connect Google Search Console.
                    </p>
                  )}
                  <p className="text-[11px] text-ink-muted">
                    Grants read-only access to your search performance data. You can disconnect anytime.
                  </p>
                </>
              ) : (
                <div className="flex items-start gap-3 border border-editorial-gold/30 bg-editorial-gold/5 px-4 py-3">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-editorial-gold" />
                  <div className="text-sm text-ink-secondary">
                    <p className="font-semibold text-ink">Google OAuth Not Configured (Admin)</p>
                    <p className="mt-1">
                      Set <code className="bg-surface-raised px-1 py-0.5 font-mono text-[10px]">GOOGLE_OAUTH_CLIENT_ID</code> and <code className="bg-surface-raised px-1 py-0.5 font-mono text-[10px]">GOOGLE_OAUTH_CLIENT_SECRET</code> environment variables to enable Search Console integration.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Connected: show property picker */}
          {gscIsConnected && (
            <div className="flex flex-col gap-3">
              <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Select GSC Property
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowGscPropertyPicker(!showGscPropertyPicker);
                    if (gscProperties.length === 0) loadGSCProperties();
                  }}
                  className="flex h-10 w-full items-center justify-between border border-rule bg-surface-card px-3 text-sm text-ink hover:bg-surface-raised"
                >
                  <span className={gscSelectedProperty ? "font-mono text-xs" : "text-ink-muted"}>
                    {gscSelectedProperty || "Choose a property..."}
                  </span>
                  <ChevronDown size={14} className="text-ink-muted" />
                </button>
                {showGscPropertyPicker && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto border border-rule bg-surface-card shadow-lg">
                    {gscPropertiesLoading ? (
                      <div className="flex items-center gap-2 px-4 py-3 text-sm text-ink-muted">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-muted border-t-transparent" />
                        Loading properties...
                      </div>
                    ) : gscProperties.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-ink-muted">
                        No GSC properties found. Make sure your Google account is verified as an owner/user of at least one site in Search Console.
                      </div>
                    ) : (
                      gscProperties.map((prop) => (
                        <button
                          key={prop.siteUrl}
                          type="button"
                          onClick={() => handleSelectGSCProperty(prop.siteUrl)}
                          className={`flex w-full flex-col px-4 py-2.5 text-left hover:bg-surface-raised ${
                            gscSelectedProperty === prop.siteUrl ? "bg-surface-raised" : ""
                          }`}
                        >
                          <span className="text-sm font-medium text-ink">
                            {prop.siteUrl}
                            {gscSelectedProperty === prop.siteUrl && (
                              <Check size={12} className="ml-2 inline text-editorial-green" />
                            )}
                          </span>
                          <span className="text-[11px] text-ink-muted">
                            {prop.permissionLevel}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Test connection */}
              {gscSelectedProperty && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending || gscTestStatus === "testing"}
                    onClick={handleTestGSC}
                  >
                    {gscTestStatus === "testing" ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-muted border-t-transparent" />
                    ) : gscTestStatus === "success" ? (
                      <Check size={14} className="text-editorial-green" />
                    ) : (
                      <Globe size={14} />
                    )}
                    {gscTestStatus === "testing" ? "Testing..." : "Test Connection"}
                  </Button>
                  {gscTestStatus === "success" && gscTestMessage && (
                    <span className="text-xs text-editorial-green">{gscTestMessage}</span>
                  )}
                </div>
              )}
              {gscTestStatus === "error" && gscTestMessage && (
                <div className="flex items-start gap-2 border border-editorial-red/30 bg-editorial-red/5 px-4 py-3">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-editorial-red" />
                  <p className="text-sm text-editorial-red">{gscTestMessage}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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

      {/* Microsoft Teams Integration */}
      <div>
        <ColumnHeader
          title="Microsoft Teams Integration"
          subtitle="Receive SEO notifications in your Teams channels"
        />
        <div className="mt-4 flex flex-col gap-4 border border-rule bg-surface-card p-5">
          <div className="flex items-center gap-3">
            <Input
              label="Teams Webhook URL"
              placeholder="https://outlook.office.com/webhook/..."
              value={teamsUrl}
              onChange={(e) => setTeamsUrl(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveTeams}
              disabled={!teamsUrl || isPending}
            >
              {teamsSaved ? <Check size={14} /> : <Globe size={14} />}
              {teamsSaved ? "Saved" : "Save Webhook"}
            </Button>
            {settings.teamsWebhookUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestTeams}
                disabled={isPending}
              >
                {teamsTested ? <Check size={14} /> : <Send size={14} />}
                {teamsTested ? "Sent!" : "Test"}
              </Button>
            )}
          </div>
          <p className="text-xs text-ink-muted">
            Create an incoming webhook connector in your Teams channel settings, then paste the URL above.
            Notifications use Adaptive Card format for rich display.
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
                    Added {formatDate(wh.created_at, timezone)}
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
