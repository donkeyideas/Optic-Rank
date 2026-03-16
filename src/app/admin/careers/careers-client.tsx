"use client";

import { useState } from "react";
import { createJob, updateJob, deleteJob } from "@/lib/actions/jobs";

type Job = {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  type: string | null;
  description: string;
  requirements: string[];
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
};

export function CareersClient({ jobs }: { jobs: Job[] }) {
  const [editing, setEditing] = useState<Job | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("Remote");
  const [jobType, setJobType] = useState<"full-time" | "part-time" | "contract">("full-time");
  const [description, setDescription] = useState("");
  const [reqsInput, setReqsInput] = useState("");
  const [isActive, setIsActive] = useState(true);

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setTitle("");
    setDepartment("");
    setLocation("Remote");
    setJobType("full-time");
    setDescription("");
    setReqsInput("");
    setIsActive(true);
    setError("");
  }

  function openEdit(job: Job) {
    setCreating(false);
    setEditing(job);
    setTitle(job.title);
    setDepartment(job.department ?? "");
    setLocation(job.location ?? "Remote");
    setJobType((job.type as "full-time" | "part-time" | "contract") ?? "full-time");
    setDescription(job.description);
    setReqsInput(Array.isArray(job.requirements) ? job.requirements.join("\n") : "");
    setIsActive(job.is_active ?? true);
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
    const requirements = reqsInput.split("\n").map((r) => r.trim()).filter(Boolean);

    try {
      if (creating) {
        const result = await createJob({
          title,
          department: department || undefined,
          location: location || undefined,
          type: jobType,
          description,
          requirements,
          is_active: isActive,
        });
        if ("error" in result) setError(result.error);
        else { closeForm(); window.location.reload(); }
      } else if (editing) {
        const result = await updateJob(editing.id, {
          title,
          department: department || undefined,
          location: location || undefined,
          type: jobType,
          description,
          requirements,
          is_active: isActive,
        });
        if ("error" in result) setError(result.error);
        else { closeForm(); window.location.reload(); }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this job listing?")) return;
    const result = await deleteJob(id);
    if ("error" in result) alert(result.error);
    else window.location.reload();
  }

  async function toggleActive(job: Job) {
    await updateJob(job.id, { is_active: !job.is_active });
    window.location.reload();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Careers</h1>
          <p className="mt-1 text-sm text-ink-secondary">Manage job listings on the careers page.</p>
        </div>
        <button onClick={openCreate} className="inline-flex h-9 items-center bg-editorial-red px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-editorial-red/90">
          New Job
        </button>
      </div>

      {(creating || editing) && (
        <div className="mb-6 border border-rule bg-surface-card p-6">
          <h2 className="mb-4 font-serif text-lg font-bold text-ink">
            {creating ? "New Job Listing" : "Edit Job Listing"}
          </h2>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Department</label>
                <input value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Type</label>
                <select value={jobType} onChange={(e) => setJobType(e.target.value as typeof jobType)} className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none">
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
                  Active
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Description (Markdown)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} className="w-full border border-rule bg-surface-cream px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">Requirements (one per line)</label>
              <textarea value={reqsInput} onChange={(e) => setReqsInput(e.target.value)} rows={4} className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none" placeholder="5+ years experience&#10;Strong TypeScript skills" />
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
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Department</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Location</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Active</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-muted">No job listings yet.</td></tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-b border-rule last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-ink">{job.title}</div>
                    <div className="text-xs capitalize text-ink-muted">{job.type}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{job.department ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{job.location ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(job)} className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${job.is_active ? "bg-editorial-green/10 text-editorial-green" : "bg-surface-raised text-ink-muted"}`}>
                      {job.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(job)} className="text-xs font-medium text-editorial-red hover:underline">Edit</button>
                      <button onClick={() => handleDelete(job.id)} className="text-xs font-medium text-ink-muted hover:text-editorial-red">Delete</button>
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
