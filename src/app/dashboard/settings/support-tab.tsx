"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Send,
  ChevronLeft,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createSupportTicket,
  getTicketWithReplies,
  addReplyToTicket,
} from "@/lib/actions/support";

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  category: string;
  created_at: string;
  replyCount: number;
};

type Reply = {
  id: string;
  sender_role: string;
  message: string;
  created_at: string;
};

type TicketDetail = Ticket & { replies: Reply[] };

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "billing", label: "Billing" },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: typeof Clock; className: string; label: string }> = {
    new: { icon: AlertCircle, className: "text-editorial-gold bg-editorial-gold/10", label: "New" },
    read: { icon: Clock, className: "text-ink-muted bg-ink/5", label: "Read" },
    replied: { icon: CheckCircle, className: "text-editorial-green bg-editorial-green/10", label: "Replied" },
  };
  const c = config[status] || config.new;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${c.className}`}>
      <Icon size={12} />
      {c.label}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SupportTab({ tickets: initialTickets }: { tickets: Ticket[] }) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [isPending, startTransition] = useTransition();

  // New ticket form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [error, setError] = useState("");

  // Reply form
  const [replyText, setReplyText] = useState("");

  function handleNewTicket() {
    setSubject("");
    setMessage("");
    setCategory("general");
    setError("");
    setView("new");
  }

  function handleSubmitTicket() {
    if (!subject.trim() || !message.trim()) {
      setError("Subject and message are required.");
      return;
    }
    startTransition(async () => {
      const result = await createSupportTicket(subject, message, category);
      if ("error" in result) {
        setError(result.error);
      } else {
        setView("list");
        router.refresh();
      }
    });
  }

  function handleOpenTicket(ticketId: string) {
    startTransition(async () => {
      const detail = await getTicketWithReplies(ticketId);
      if (detail) {
        setSelectedTicket(detail as TicketDetail);
        setReplyText("");
        setView("detail");
      }
    });
  }

  function handleSendReply() {
    if (!replyText.trim() || !selectedTicket) return;
    startTransition(async () => {
      const result = await addReplyToTicket(selectedTicket.id, replyText);
      if ("success" in result) {
        // Refresh ticket detail
        const detail = await getTicketWithReplies(selectedTicket.id);
        if (detail) setSelectedTicket(detail as TicketDetail);
        setReplyText("");
        router.refresh();
      }
    });
  }

  // ── New Ticket Form ──
  if (view === "new") {
    return (
      <div>
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-4"
        >
          <ChevronLeft size={16} />
          Back to tickets
        </button>

        <h3 className="font-serif text-lg font-bold text-ink mb-4">
          New Support Ticket
        </h3>

        {error && (
          <div className="mb-4 border border-editorial-red/30 bg-editorial-red/5 p-3 text-sm text-editorial-red">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-rule bg-surface-card p-2 text-sm text-ink"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              className="w-full border border-rule bg-surface-card p-2 text-sm text-ink placeholder:text-ink-muted"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={6}
              className="w-full border border-rule bg-surface-card p-2 text-sm text-ink placeholder:text-ink-muted resize-y"
            />
          </div>

          <Button
            variant="primary"
            onClick={handleSubmitTicket}
            disabled={isPending}
          >
            {isPending ? "Submitting..." : "Submit Ticket"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Ticket Detail View ──
  if (view === "detail" && selectedTicket) {
    return (
      <div>
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-4"
        >
          <ChevronLeft size={16} />
          Back to tickets
        </button>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-ink">
              {selectedTicket.subject}
            </h3>
            <p className="text-[12px] text-ink-muted mt-1">
              Opened {formatDate(selectedTicket.created_at)}
            </p>
          </div>
          <StatusBadge status={selectedTicket.status} />
        </div>

        {/* Conversation thread */}
        <div className="border border-rule divide-y divide-rule mb-4">
          {/* Original message */}
          <div className="p-4 bg-surface-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                You
              </span>
              <span className="text-[11px] text-ink-muted">
                {formatDate(selectedTicket.created_at)}
              </span>
            </div>
            <p className="text-sm text-ink whitespace-pre-wrap">
              {selectedTicket.message}
            </p>
          </div>

          {/* Replies */}
          {selectedTicket.replies.map((reply) => (
            <div
              key={reply.id}
              className={`p-4 ${reply.sender_role === "admin" ? "bg-editorial-green/5" : "bg-surface-card"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  {reply.sender_role === "admin" ? "Support" : "You"}
                </span>
                <span className="text-[11px] text-ink-muted">
                  {formatDate(reply.created_at)}
                </span>
              </div>
              <p className="text-sm text-ink whitespace-pre-wrap">
                {reply.message}
              </p>
            </div>
          ))}
        </div>

        {/* Reply input */}
        <div className="flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            className="flex-1 border border-rule bg-surface-card p-2 text-sm text-ink placeholder:text-ink-muted resize-y"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendReply}
            disabled={isPending || !replyText.trim()}
            className="self-end"
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    );
  }

  // ── Ticket List ──
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg font-bold text-ink">
          Support
        </h3>
        <Button variant="primary" size="sm" onClick={handleNewTicket}>
          New Ticket
        </Button>
      </div>

      {initialTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-rule p-12 text-center">
          <MessageSquare size={32} className="text-ink-muted mb-3" />
          <h4 className="font-serif text-base font-bold text-ink mb-1">
            No support tickets yet
          </h4>
          <p className="text-sm text-ink-muted mb-4">
            Have a question or need help? Create a support ticket and our team
            will get back to you.
          </p>
          <Button variant="outline" size="sm" onClick={handleNewTicket}>
            Create Your First Ticket
          </Button>
        </div>
      ) : (
        <div className="border border-rule divide-y divide-rule">
          {initialTickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => handleOpenTicket(ticket.id)}
              disabled={isPending}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-raised transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-sans text-sm font-semibold text-ink truncate">
                    {ticket.subject}
                  </span>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="text-[12px] text-ink-muted truncate">
                  {ticket.message}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[11px] text-ink-muted">
                    {formatDate(ticket.created_at)}
                  </span>
                  {ticket.replyCount > 0 && (
                    <span className="text-[11px] text-ink-muted">
                      {ticket.replyCount} {ticket.replyCount === 1 ? "reply" : "replies"}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
