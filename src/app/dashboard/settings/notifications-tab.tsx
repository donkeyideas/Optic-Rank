"use client";

import { useState, useTransition } from "react";
import { Mail, Smartphone, Newspaper, TrendingUp, Link2, Shield, FileText } from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
import { updateNotificationPreferences, type NotificationPrefs } from "@/lib/actions/settings";
import type { Profile } from "@/types";

const DEFAULT_PREFS: NotificationPrefs = {
  email: true,
  push: true,
  weekly_digest: true,
  rank_changes: true,
  backlink_alerts: true,
  audit_complete: true,
  report_ready: true,
};

interface NotificationsTabProps {
  profile: Profile;
}

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ icon, label, description, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-rule px-0 py-4 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-rule bg-surface-cream text-ink-muted dark:bg-ink/10">
          {icon}
        </div>
        <div>
          <p className="font-sans text-[13px] font-semibold text-ink">{label}</p>
          <p className="font-sans text-[11px] text-ink-muted">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center border transition-colors focus:outline-none ${
          checked
            ? "border-editorial-green bg-editorial-green"
            : "border-rule bg-ink/10"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function NotificationsTab({ profile }: NotificationsTabProps) {
  const prefs = (profile.notification_prefs as unknown as NotificationPrefs) ?? DEFAULT_PREFS;
  const [localPrefs, setLocalPrefs] = useState<NotificationPrefs>({ ...DEFAULT_PREFS, ...prefs });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleToggle(key: keyof NotificationPrefs, value: boolean) {
    const updated = { ...localPrefs, [key]: value };
    setLocalPrefs(updated);
    setSaved(false);

    startTransition(async () => {
      const result = await updateNotificationPreferences({ [key]: value });
      if (!("error" in result)) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="max-w-2xl">
      <ColumnHeader title="Notification Preferences" subtitle="Control how and when you receive notifications" />

      {/* Channels */}
      <div className="mt-6">
        <h3 className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Channels</h3>
        <ToggleRow
          icon={<Mail size={14} />}
          label="Email Notifications"
          description="Receive notifications via email"
          checked={localPrefs.email}
          onChange={(v) => handleToggle("email", v)}
          disabled={isPending}
        />
        <ToggleRow
          icon={<Smartphone size={14} />}
          label="Push Notifications"
          description="Receive push notifications on your devices"
          checked={localPrefs.push}
          onChange={(v) => handleToggle("push", v)}
          disabled={isPending}
        />
        <ToggleRow
          icon={<Newspaper size={14} />}
          label="Weekly Digest"
          description="Get a weekly summary of all activity"
          checked={localPrefs.weekly_digest}
          onChange={(v) => handleToggle("weekly_digest", v)}
          disabled={isPending}
        />
      </div>

      {/* Events */}
      <div className="mt-8">
        <h3 className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Events</h3>
        <ToggleRow
          icon={<TrendingUp size={14} />}
          label="Rank Changes"
          description="Alert when keyword rankings change significantly"
          checked={localPrefs.rank_changes}
          onChange={(v) => handleToggle("rank_changes", v)}
          disabled={isPending}
        />
        <ToggleRow
          icon={<Link2 size={14} />}
          label="Backlink Alerts"
          description="Notify when new or lost backlinks are detected"
          checked={localPrefs.backlink_alerts}
          onChange={(v) => handleToggle("backlink_alerts", v)}
          disabled={isPending}
        />
        <ToggleRow
          icon={<Shield size={14} />}
          label="Audit Complete"
          description="Notify when a site audit finishes"
          checked={localPrefs.audit_complete}
          onChange={(v) => handleToggle("audit_complete", v)}
          disabled={isPending}
        />
        <ToggleRow
          icon={<FileText size={14} />}
          label="Report Ready"
          description="Notify when a scheduled report is generated"
          checked={localPrefs.report_ready}
          onChange={(v) => handleToggle("report_ready", v)}
          disabled={isPending}
        />
      </div>

      {/* Save indicator */}
      {saved && (
        <p className="mt-4 text-[12px] font-semibold text-editorial-green">
          Preferences saved
        </p>
      )}
    </div>
  );
}
