"use client";

import { useState } from "react";
import { updateContactStatus } from "@/lib/actions/contact";

type Contact = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string | null;
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

  async function handleStatusChange(id: string, newStatus: "new" | "read" | "replied") {
    await updateContactStatus(id, newStatus);
    window.location.reload();
  }

  const statusBadge: Record<string, string> = {
    new: "bg-editorial-red/10 text-editorial-red",
    read: "bg-editorial-gold/10 text-editorial-gold",
    replied: "bg-editorial-green/10 text-editorial-green",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-ink">Contact Submissions</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {total} total submission{total !== 1 ? "s" : ""} from the contact form.
        </p>
      </div>

      <div className="border border-rule">
        <table className="w-full">
          <thead>
            <tr className="border-b border-rule bg-surface-raised text-left">
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Name</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Email</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Subject</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Status</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Date</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-muted">
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
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {contact.email}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {contact.subject ?? "—"}
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
                      <td colSpan={5} className="bg-surface-raised px-6 py-4">
                        <div className="mb-3">
                          <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                            Message
                          </span>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-secondary">
                            {contact.message}
                          </p>
                        </div>
                        <div className="flex gap-2">
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
