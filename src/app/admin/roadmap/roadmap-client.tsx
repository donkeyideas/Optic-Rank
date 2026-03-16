"use client";

import { useState, useMemo } from "react";
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

type Status = "planned" | "in_progress" | "completed";
type Category = "feature" | "improvement" | "integration";

const statusConfig: Record<Status, { label: string; badge: string; dot: string }> = {
  planned: {
    label: "Planned",
    badge: "bg-surface-raised text-ink-muted",
    dot: "bg-ink-muted",
  },
  in_progress: {
    label: "In Progress",
    badge: "bg-editorial-gold/10 text-editorial-gold",
    dot: "bg-editorial-gold",
  },
  completed: {
    label: "Completed",
    badge: "bg-editorial-green/10 text-editorial-green",
    dot: "bg-editorial-green",
  },
};

const categoryConfig: Record<Category, { label: string; badge: string }> = {
  feature: { label: "Feature", badge: "bg-editorial-red/10 text-editorial-red" },
  improvement: { label: "Improvement", badge: "bg-editorial-gold/10 text-editorial-gold" },
  integration: { label: "Integration", badge: "bg-blue-500/10 text-blue-600" },
};

type FilterTab = "all" | Status;

export function RoadmapClient({ items }: { items: Item[] }) {
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("planned");
  const [quarter, setQuarter] = useState("");
  const [category, setCategory] = useState<Category>("feature");
  const [sortOrder, setSortOrder] = useState(0);

  /* ---------- derived stats ---------- */
  const stats = useMemo(() => {
    const planned = items.filter((i) => i.status === "planned").length;
    const inProgress = items.filter((i) => i.status === "in_progress").length;
    const completed = items.filter((i) => i.status === "completed").length;
    const total = items.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, planned, inProgress, completed, pct };
  }, [items]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((i) => i.status === activeTab);
  }, [items, activeTab]);

  /* ---------- form helpers ---------- */
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
    setStatus((item.status as Status) ?? "planned");
    setQuarter(item.quarter ?? "");
    setCategory((item.category as Category) ?? "feature");
    setSortOrder(item.sort_order ?? 0);
    setError("");
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setError("");
  }

  async function handleSave() {
    if (!title.trim()) { setError("Title is required."); return; }
    setLoading(true);
    setError("");
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        quarter: quarter.trim() || undefined,
        category,
        sort_order: sortOrder,
      };
      if (creating) {
        const result = await createRoadmapItem(payload);
        if ("error" in result) setError(result.error);
        else { closeForm(); window.location.reload(); }
      } else if (editing) {
        const result = await updateRoadmapItem(editing.id, payload);
        if ("error" in result) setError(result.error);
        else { closeForm(); window.location.reload(); }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this roadmap item? This cannot be undone.")) return;
    const result = await deleteRoadmapItem(id);
    if ("error" in result) alert(result.error);
    else window.location.reload();
  }

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "in_progress", label: "In Progress", count: stats.inProgress },
    { key: "planned", label: "Planned", count: stats.planned },
    { key: "completed", label: "Completed", count: stats.completed },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Roadmap</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Manage the public product roadmap. Items are visible at{" "}
            <span className="font-mono text-xs text-editorial-red">/roadmap</span>.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex h-9 items-center bg-editorial-red px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-editorial-red/90"
        >
          New Item
        </button>
      </div>

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="border border-rule bg-surface-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Total Items</p>
          <p className="mt-1 font-mono text-2xl font-bold text-ink">{stats.total}</p>
        </div>
        <div className="border border-rule bg-surface-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Planned</p>
          <p className="mt-1 font-mono text-2xl font-bold text-ink-muted">{stats.planned}</p>
        </div>
        <div className="border border-rule bg-surface-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-editorial-gold">In Progress</p>
          <p className="mt-1 font-mono text-2xl font-bold text-editorial-gold">{stats.inProgress}</p>
        </div>
        <div className="border border-rule bg-surface-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-editorial-green">Completed</p>
          <p className="mt-1 font-mono text-2xl font-bold text-editorial-green">{stats.completed}</p>
        </div>
        <div className="border border-rule bg-surface-card p-4 col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Completion</p>
          <p className="mt-1 font-mono text-2xl font-bold text-ink">{stats.pct}%</p>
          <div className="mt-2 h-1.5 w-full bg-surface-raised">
            <div
              className="h-full bg-editorial-green transition-all duration-500"
              style={{ width: `${stats.pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Form */}
      {(creating || editing) && (
        <div className="mb-6 border border-rule bg-surface-card p-6">
          <h2 className="mb-4 font-serif text-lg font-bold text-ink">
            {creating ? "New Roadmap Item" : "Edit Roadmap Item"}
          </h2>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                  Title *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Google Search Console Integration"
                  className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="feature">Feature</option>
                    <option value="improvement">Improvement</option>
                    <option value="integration">Integration</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief description of the feature or improvement..."
                className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                  Quarter
                </label>
                <input
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  placeholder="Q2 2026"
                  className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-full border border-rule bg-surface-cream px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-ink-muted">Lower numbers appear first</p>
              </div>
              <div className="flex items-end">
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="inline-flex h-9 items-center bg-editorial-red px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-editorial-red/90 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={closeForm}
                    className="inline-flex h-9 items-center border border-rule px-5 text-xs font-bold uppercase tracking-widest text-ink-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-editorial-red">{error}</p>}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 border-b border-rule">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              activeTab === tab.key
                ? "text-ink after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-editorial-red"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 font-mono text-[10px]">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-rule">
        <table className="w-full">
          <thead>
            <tr className="border-b border-rule bg-surface-raised text-left">
              <th className="w-8 px-3 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">#</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Item</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Status</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Quarter</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Category</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Updated</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-sm text-ink-muted">
                    {activeTab === "all"
                      ? "No roadmap items yet. Click \"New Item\" to add your first."
                      : `No ${statusConfig[activeTab as Status]?.label.toLowerCase()} items.`}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const st = statusConfig[(item.status as Status) ?? "planned"];
                const cat = categoryConfig[(item.category as Category) ?? "feature"];
                return (
                  <tr key={item.id} className="border-b border-rule last:border-b-0 hover:bg-surface-raised/50 transition-colors">
                    <td className="px-3 py-3 font-mono text-[10px] text-ink-muted">
                      {item.sort_order ?? idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                      {item.description && (
                        <p className="mt-0.5 text-xs text-ink-muted line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${st.badge}`}>
                          {st.label}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {item.quarter ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${cat.badge}`}>
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-xs font-medium text-editorial-red hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-xs font-medium text-ink-muted hover:text-editorial-red"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <p className="mt-4 text-[10px] text-ink-muted">
        {stats.total} item{stats.total !== 1 ? "s" : ""} on the public roadmap &middot;{" "}
        {stats.completed} shipped &middot; {stats.inProgress} in development
      </p>
    </div>
  );
}
