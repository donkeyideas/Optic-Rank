"use client";

import { useState } from "react";
import {
  createChangelogEntry,
  updateChangelogEntry,
  deleteChangelogEntry,
} from "@/lib/actions/changelog";

type Entry = {
  id: string;
  title: string;
  slug: string;
  content: string;
  version: string | null;
  type: string | null;
  published_at: string | null;
  created_at: string;
};

export function ChangelogClient({ entries }: { entries: Entry[] }) {
  const [editing, setEditing] = useState<Entry | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [version, setVersion] = useState("");
  const [type, setType] = useState<"feature" | "improvement" | "fix">("improvement");

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setTitle("");
    setSlug("");
    setContent("");
    setVersion("");
    setType("improvement");
    setError("");
  }

  function openEdit(entry: Entry) {
    setCreating(false);
    setEditing(entry);
    setTitle(entry.title);
    setSlug(entry.slug);
    setContent(entry.content);
    setVersion(entry.version ?? "");
    setType((entry.type as "feature" | "improvement" | "fix") ?? "improvement");
    setError("");
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setError("");
  }

  function generateSlug(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    try {
      if (creating) {
        const result = await createChangelogEntry({
          title,
          slug: slug || generateSlug(title),
          content,
          version: version || undefined,
          type,
        });
        if ("error" in result) setError(result.error);
        else { closeForm(); window.location.reload(); }
      } else if (editing) {
        const result = await updateChangelogEntry(editing.id, {
          title,
          slug,
          content,
          version: version || undefined,
          type,
        });
        if ("error" in result) setError(result.error);
        else { closeForm(); window.location.reload(); }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    const result = await deleteChangelogEntry(id);
    if ("error" in result) alert(result.error);
    else window.location.reload();
  }

  const typeBadge: Record<string, string> = {
    feature: "bg-editorial-green/10 text-editorial-green",
    improvement: "bg-editorial-gold/10 text-editorial-gold",
    fix: "bg-editorial-red/10 text-editorial-red",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Changelog</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Manage product changelog entries.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex h-9 items-center bg-editorial-red px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-editorial-red/90"
        >
          New Entry
        </button>
      </div>

      {(creating || editing) && (
        <div className="mb-6 border border-rule bg-surface-card p-6">
          <h2 className="mb-4 font-serif text-lg font-bold text-ink">
            {creating ? "New Entry" : "Edit Entry"}
          </h2>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Title</label>
                <input
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); if (creating) setSlug(generateSlug(e.target.value)); }}
                  className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Version</label>
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v2.4.0"
                  className="w-full border border-rule bg-surface-cream px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "feature" | "improvement" | "fix")}
                  className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                >
                  <option value="feature">Feature</option>
                  <option value="improvement">Improvement</option>
                  <option value="fix">Fix</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </div>
            {error && <p className="text-sm text-editorial-red">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={loading} className="inline-flex h-9 items-center bg-editorial-red px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-editorial-red/90 disabled:opacity-50">
                {loading ? "Saving..." : "Save"}
              </button>
              <button onClick={closeForm} className="inline-flex h-9 items-center border border-rule px-5 text-xs font-bold uppercase tracking-widest text-ink-muted hover:text-ink">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-rule">
        <table className="w-full">
          <thead>
            <tr className="border-b border-rule bg-surface-raised text-left">
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Title</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Version</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Type</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Date</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-muted">No entries yet.</td></tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-b border-rule last:border-b-0">
                  <td className="px-4 py-3 text-sm font-medium text-ink">{entry.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{entry.version ?? "—"}</td>
                  <td className="px-4 py-3">
                    {entry.type && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${typeBadge[entry.type] ?? ""}`}>
                        {entry.type}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {entry.published_at ? new Date(entry.published_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(entry)} className="text-xs font-medium text-editorial-red hover:underline">Edit</button>
                      <button onClick={() => handleDelete(entry.id)} className="text-xs font-medium text-ink-muted hover:text-editorial-red">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
