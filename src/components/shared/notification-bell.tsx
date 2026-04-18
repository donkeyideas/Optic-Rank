"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";
import {
  getUserNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
} from "@/lib/actions/support";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    const data = await getUserNotifications(15);
    setNotifications(data as Notification[]);
    setLoading(false);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleClickNotification(n: Notification) {
    if (!n.is_read) {
      await markNotificationsRead([n.id]);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      );
    }
    if (n.action_url) {
      setOpen(false);
      window.location.href = n.action_url;
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative flex items-center gap-1.5 rounded-none border border-surface-cream/20 px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-surface-cream/70 transition-colors hover:bg-surface-cream/10 hover:text-surface-cream"
      >
        <Bell size={12} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-editorial-red px-0.5 text-[8px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 border border-rule bg-surface-card shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-ink">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[10px] font-medium text-editorial-red hover:text-editorial-red/80"
              >
                <Check size={10} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-xs text-ink-muted">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-ink-muted">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-raised ${
                    !n.is_read ? "bg-editorial-red/5" : ""
                  }`}
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0">
                    {!n.is_read ? (
                      <span className="block h-2 w-2 rounded-full bg-editorial-red" />
                    ) : (
                      <span className="block h-2 w-2" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink">
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                        {n.message}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-ink-muted">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {n.action_url && (
                    <ExternalLink
                      size={10}
                      className="mt-1 shrink-0 text-ink-muted"
                    />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
