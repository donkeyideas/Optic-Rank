"use client";

import { useState } from "react";
import {
  Bell,
  UserPlus,
  CreditCard,
  Activity,
  Clock,
  Mail,
  X,
} from "lucide-react";
import { BroadcastPanel } from "./broadcast-panel";
import { PushStatsPanel } from "./push-stats-panel";
import type { BroadcastHistoryEntry } from "@/lib/actions/broadcast";
import type { PushLogEntry, TokenStats, DeliveryStats } from "./push-stats-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { updateContactStatus } from "@/lib/actions/contact";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface ContactData {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
}

interface Notification {
  id: string;
  type: "signup" | "billing" | "audit" | "contact";
  title: string;
  description: string;
  timestamp: string;
  meta?: string;
  contactData?: ContactData;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function typeIcon(type: Notification["type"]) {
  switch (type) {
    case "signup":
      return <UserPlus size={16} className="text-editorial-green" />;
    case "billing":
      return <CreditCard size={16} className="text-editorial-gold" />;
    case "audit":
      return <Activity size={16} className="text-ink-muted" />;
    case "contact":
      return <Mail size={16} className="text-editorial-red" />;
  }
}

function typeBadge(type: Notification["type"]) {
  switch (type) {
    case "signup":
      return <Badge variant="success">Signup</Badge>;
    case "billing":
      return <Badge variant="info">Billing</Badge>;
    case "audit":
      return <Badge variant="muted">Activity</Badge>;
    case "contact":
      return <Badge variant="danger">Contact</Badge>;
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------
   Group by date
   ------------------------------------------------------------------ */

function groupByDate(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};

  for (const n of notifications) {
    const date = new Date(n.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) {
      label = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = "Yesterday";
    } else {
      label = date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }

  return groups;
}

/* ------------------------------------------------------------------
   Contact Detail Modal
   ------------------------------------------------------------------ */

function ContactModal({
  contact,
  onClose,
}: {
  contact: ContactData;
  onClose: () => void;
}) {
  const [status, setStatus] = useState(contact.status);

  async function handleStatusChange(newStatus: "new" | "read" | "replied") {
    setStatus(newStatus);
    await updateContactStatus(contact.id, newStatus);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-lg border border-rule bg-surface-card shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-rule px-6 py-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg font-bold text-ink">
              {contact.subject || "No subject"}
            </h3>
            <p className="mt-0.5 text-sm text-ink-secondary">
              From {contact.name} &lt;{contact.email}&gt;
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 p-1 text-ink-muted transition-colors hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
            {contact.message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-rule px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Status
            </span>
            <div className="flex gap-1">
              {(["new", "read", "replied"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`rounded-none border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                    status === s
                      ? s === "new"
                        ? "border-editorial-red bg-editorial-red/10 text-editorial-red"
                        : s === "replied"
                          ? "border-editorial-green bg-editorial-green/10 text-editorial-green"
                          : "border-editorial-gold bg-editorial-gold/10 text-editorial-gold"
                      : "border-rule text-ink-muted hover:bg-surface-raised"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="border border-rule px-4 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-raised"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function NotificationsClient({
  notifications,
  unreadCount,
  broadcastHistory = [],
  pushLog = [],
  pushTokenStats,
  pushDeliveryStats,
}: {
  notifications: Notification[];
  unreadCount: number;
  broadcastHistory?: BroadcastHistoryEntry[];
  pushLog?: PushLogEntry[];
  pushTokenStats?: TokenStats;
  pushDeliveryStats?: DeliveryStats;
}) {
  const [selectedContact, setSelectedContact] = useState<ContactData | null>(null);
  const [activeTab, setActiveTab] = useState<"activity" | "broadcast" | "push-stats">("activity");
  const grouped = groupByDate(notifications);
  const groupKeys = Object.keys(grouped);

  // Count by type
  const signupCount = notifications.filter((n) => n.type === "signup").length;
  const billingCount = notifications.filter((n) => n.type === "billing").length;
  const contactCount = notifications.filter((n) => n.type === "contact").length;

  const tabs = [
    { key: "activity" as const, label: "Activity Feed" },
    { key: "broadcast" as const, label: "Broadcast" },
    { key: "push-stats" as const, label: "Push Stats" },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-2xl font-bold text-ink">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-editorial-red px-1.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-secondary">
          Recent activity across the platform — signups, payments, messages, and
          system events.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-6 border-b-2 border-rule">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative pb-3 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${
              activeTab === tab.key
                ? "text-editorial-red after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-[2px] after:bg-editorial-red after:content-['']"
                : "text-ink-muted hover:text-ink-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Broadcast Tab */}
      {activeTab === "broadcast" && (
        <BroadcastPanel initialHistory={broadcastHistory} />
      )}

      {/* Push Stats Tab */}
      {activeTab === "push-stats" && pushTokenStats && pushDeliveryStats && (
        <PushStatsPanel
          log={pushLog}
          tokenStats={pushTokenStats}
          deliveryStats={pushDeliveryStats}
        />
      )}

      {/* Activity Feed Tab */}
      {activeTab === "activity" && (
        <>
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Total Events
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {notifications.length}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Bell size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                New Signups
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-editorial-green">
                {signupCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <UserPlus
                size={18}
                strokeWidth={1.5}
                className="text-ink-muted"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Billing Events
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-editorial-gold">
                {billingCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <CreditCard
                size={18}
                strokeWidth={1.5}
                className="text-ink-muted"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Messages
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-editorial-red">
                {contactCount}
              </p>
              {unreadCount > 0 && (
                <p className="mt-0.5 text-[10px] font-medium text-editorial-red">
                  {unreadCount} unread
                </p>
              )}
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Mail size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No activity yet"
          description="Platform activity will appear here as users sign up, make payments, and interact with the system."
        />
      ) : (
        <div className="space-y-6">
          {groupKeys.map((dateLabel) => (
            <div key={dateLabel}>
              {/* Date header */}
              <div className="mb-3 flex items-center gap-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  {dateLabel}
                </span>
                <div className="h-px flex-1 bg-rule" />
                <span className="font-mono text-[10px] text-ink-muted">
                  {grouped[dateLabel].length} events
                </span>
              </div>

              {/* Events */}
              <div className="space-y-1">
                {grouped[dateLabel].map((n) => {
                  const isContact = n.type === "contact" && n.contactData;
                  const isUnread = isContact && n.contactData?.status === "new";

                  return (
                    <div
                      key={n.id}
                      onClick={
                        isContact
                          ? () => setSelectedContact(n.contactData!)
                          : undefined
                      }
                      className={`flex items-start gap-3 border px-4 py-3 transition-colors ${
                        isContact
                          ? "cursor-pointer hover:bg-surface-raised"
                          : ""
                      } ${
                        isUnread
                          ? "border-editorial-red/30 bg-editorial-red/5"
                          : "border-rule bg-surface-card hover:bg-surface-raised"
                      }`}
                    >
                      {/* Icon */}
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-rule bg-surface-cream">
                        {typeIcon(n.type)}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-sm font-medium capitalize text-ink">
                            {n.title}
                          </span>
                          {typeBadge(n.type)}
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-editorial-red" />
                          )}
                          {n.meta &&
                            n.type !== "contact" && (
                              <Badge variant="muted" className="text-[10px]">
                                {n.meta}
                              </Badge>
                            )}
                        </div>
                        <p className="mt-0.5 text-xs text-ink-secondary">
                          {n.description}
                        </p>
                      </div>

                      {/* Timestamp */}
                      <div className="shrink-0 text-right">
                        <div className="flex items-center gap-1 text-ink-muted">
                          <Clock size={10} />
                          <span className="font-mono text-[10px]">
                            {timeAgo(n.timestamp)}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[9px] text-ink-muted">
                          {formatDateTime(n.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact Detail Modal */}
      {selectedContact && (
        <ContactModal
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
        />
      )}
        </>
      )}
    </div>
  );
}
