"use client";

import { useState, useTransition, useEffect } from "react";
import { updateContactStatus } from "@/lib/actions/contact";
import { adminReplyToTicket, getTicketReplies } from "@/lib/actions/support";

type Contact = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string | null;
  category?: string | null;
  user_id?: string | null;
  created_at: string;
};

type Reply = {
  id: string;
  sender_role: string;
  message: string;
  created_at: string;
};

export function ContactsClient({
  contacts,
  total,
}: {
  contacts: Contact[];
  total: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyText, setReplyText] = useState("");
  const [isPending, startTransition] = useTransition();

  // Load replies when a ticket is expanded
  useEffect(() => {
    if (expanded && !replies[expanded]) {
      getTicketReplies(expanded).then((r) => {
        setReplies((prev) => ({ ...prev, [expanded]: r }));
      });
    }
  }, [expanded, replies]);

  async function handleStatusChange(id: string, newStatus: "new" | "read" | "replied") {
    await updateContactStatus(id, newStatus);
    window.location.reload();
  }

  function handleSendReply(ticketId: string) {
    if (!replyText.trim()) return;
    startTransition(async () => {
      const result = await adminReplyToTicket(ticketId, replyText);
      if ("success" in result) {
        const updated = await getTicketReplies(ticketId);
        setReplies((prev) => ({ ...prev, [ticketId]: updated }));
        setReplyText("");
      }
    });
  }

  const statusBadge: Record<string, string> = {
    new: "bg-editorial-red/10 text-editorial-red",
    read: "bg-editorial-gold/10 text-editorial-gold",
    replied: "bg-editorial-green/10 text-editorial-green",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-ink">Contact & Support Tickets</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {total} total submission{total !== 1 ? "s" : ""}. Tickets from logged-in users support threaded replies.
        </p>
      </div>

      <div className="border border-rule">
        <table className="w-full">
          <thead>
            <tr className="border-b border-rule bg-surface-raised text-left">
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Name</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Email</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Subject</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Type</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Status</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Date</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-muted">
                  No contact submissions yet.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <>
                  <tr
                    key={contact.id}
                    onClick={() =>
                      setExpanded(expanded === contact.id ? null : contact.id)
                    }
                    className="cursor-pointer border-b border-rule last:border-b-0 hover:bg-surface-raised"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-ink">
                      {contact.name}
                      {contact.user_id && (
                        <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-editorial-green">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {contact.email}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {contact.subject ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted capitalize">
                      {contact.category ?? "contact"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                          statusBadge[contact.status ?? "new"]
                        }`}
                      >
                        {contact.status ?? "new"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                  {expanded === contact.id && (
                    <tr key={`${contact.id}-detail`} className="border-b border-rule">
                      <td colSpan={6} className="bg-surface-raised px-6 py-4">
                        {/* Original message */}
                        <div className="mb-3">
                          <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                            Original Message
                          </span>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-secondary">
                            {contact.message}
                          </p>
                        </div>

                        {/* Conversation thread */}
                        {(replies[contact.id] ?? []).length > 0 && (
                          <div className="mb-3 border-t border-rule pt-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                              Conversation
                            </span>
                            <div className="mt-2 flex flex-col gap-2">
                              {(replies[contact.id] ?? []).map((reply) => (
                                <div
                                  key={reply.id}
                                  className={`p-3 text-sm ${
                                    reply.sender_role === "admin"
                                      ? "bg-editorial-green/5 border-l-2 border-editorial-green"
                                      : "bg-surface-card border-l-2 border-ink/20"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                      {reply.sender_role === "admin" ? "Admin" : "User"}
                                    </span>
                                    <span className="text-[10px] text-ink-muted">
                                      {new Date(reply.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="whitespace-pre-wrap text-ink-secondary">
                                    {reply.message}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Reply form (only for tickets from logged-in users) */}
                        {contact.user_id && (
                          <div className="mb-3 border-t border-rule pt-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                              Reply
                            </span>
                            <div className="mt-2 flex gap-2">
                              <textarea
                                value={expanded === contact.id ? replyText : ""}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type your reply..."
                                rows={3}
                                className="flex-1 border border-rule bg-surface-card p-2 text-sm text-ink placeholder:text-ink-muted resize-y"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendReply(contact.id);
                                }}
                                disabled={isPending || !replyText.trim()}
                                className="self-end bg-editorial-red px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-editorial-red/90 disabled:opacity-50"
                              >
                                {isPending ? "Sending..." : "Send Reply"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Status buttons */}
                        <div className="flex gap-2 border-t border-rule pt-3">
                          {(["new", "read", "replied"] as const).map((s) => (
                            <button
                              key={s}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(contact.id, s);
                              }}
                              className={`px-3 py-1 text-xs font-bold uppercase tracking-widest transition-colors ${
                                contact.status === s
                                  ? statusBadge[s]
                                  : "border border-rule text-ink-muted hover:text-ink"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
