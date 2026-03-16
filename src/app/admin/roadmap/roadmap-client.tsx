"use client";

import { useState } from "react";
import {
  createRoadmapItem,
  updateRoadmapItem,
  deleteRoadmapItem,
} from "@/lib/actions/roadmap";

type Item = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  quarter: string | null;
  category: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

export function RoadmapClient({ items }: { items: Item[] }) {
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"planned" | "in_progress" | "completed">("planned");
  const [quarter, setQuarter] = useState("");
  const [category, setCategory] = useState<"feature" | "improvement" | "integration">("feature");
  const [sortOrder, setSortOrder] = useState(0);

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setTitle("");
    setDescription("");
    setStatus("planned");
    setQuarter("");
    setCategory("feature");
    setSortOrder(0);
    setError("");
  }

  function openEdit(item: Item) {
    setCreating(false);
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setStatus((item.status as "planned" | "in_progress" | "completed") ?? "planned");
    setQuarter(item.quarter ?? "");
    setCategory((item.category as "feature" | "improvement" | "integration") ?? "feature");
    setSortOrder(item.sort_order ?? 0);
    setError("");
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setError("");
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    try {
      if (creating) {
        const result = await createRoadmapItem({
          title,
          description: description || undefined,
          status,
          quarter: quarter || undefined,
          category,
          sort_order: sortOrder,
        });
        if ("error" in result) setError(result.error);
        else { closeForm(); window.location.reload(); }
      } else if (editing) {
        const result = await updateRoadmapItem(editing.id, {
          title,
          description: description || undefined,
          status,
          quarter: quarter || undefined,
          category,
          sort_order: sortOrder,
        });
        if ("error" in result) setError(result.error);
        else { closeForm(); window.location.reload(); }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    const result = await deleteRoadmapItem(id);
    if ("error" in result) alert(result.error);
    else window.location.reload();
  }

  const statusBadge: Record<string, string> = {
    planned: "bg-surface-raised text-ink-muted",
    in_progress: "bg-editorial-gold/10 text-editorial-gold",
    completed: "bg-editorial-green/10 text-editorial-green",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Roadmap</h1>
          <p className="mt-1 text-sm text-ink-secondary">Manage the public product roadmap.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex h-9 items-center bg-editorial-red px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-editorial-red/90"
        >
          New Item
        </button>
      </div>

      {(creating || editing) && (
        <div className="mb-6 border border-rule bg-surface-card p-6">
          <h2 className="mb-4 font-serif text-lg font-bold text-ink">
            {creating ? "New Item" : "Edit Item"}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none" />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none">
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Quarter</label>
                <input value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="Q2 2026" className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none">
                  <option value="feature">Feature</option>
                  <option value="improvement">Improvement</option>
                  <option value="integration">Integration</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Sort Order</label>
                <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none" />
              </div>
            </div>
            {error && <p className="text-sm text-editorial-red">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={loading} className="inline-flex h-9 items-center bg-editorial-red px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-editorial-red/90 disabled:opacity-50">
                {loading ? "Saving..." : "Save"}
              </button>
              <button onClick={closeForm} className="inline-flex h-9 items-center border border-rule px-5 text-xs font-bold uppercase tracking-widest text-ink-muted hover:text-ink">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-rule">
        <table className="w-full">
          <thead>
            <tr className="border-b border-rule bg-surface-raised text-left">
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Title</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Status</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Quarter</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Category</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-muted">No items yet.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-rule last:border-b-0">
                  <td className="px-4 py-3 text-sm font-medium text-ink">{item.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${statusBadge[item.status ?? "planned"]}`}>
                      {item.status?.replace("_", " ") ?? "planned"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{item.quarter ?? "—"}</td>
                  <td className="px-4 py-3 text-xs capitalize text-ink-muted">{item.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(item)} className="text-xs font-medium text-editorial-red hover:underline">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="text-xs font-medium text-ink-muted hover:text-editorial-red">Delete</button>
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
