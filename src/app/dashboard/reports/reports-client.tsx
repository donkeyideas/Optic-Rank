"use client";

import { useState, useTransition } from "react";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";
import {
  FileDown,
  Clock,
  Plus,
  Trash2,
  Mail,
  Calendar,
  LayoutTemplate,
  Power,
  Loader2,
  CheckSquare,
  Square,
  Eye,
} from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createScheduledReport, deleteScheduledReport, toggleScheduledReport, generateReport } from "@/lib/actions/reports";
import { ALL_SECTIONS, type ReportSection } from "@/lib/pdf/report-constants";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface ScheduledReport {
  id: string;
  project_id: string;
  name?: string | null;
  template?: string | null;
  frequency?: string | null;
  day?: string | null;
  recipients?: string[] | null;
  next_run?: string | null;
  active?: boolean | null;
  [key: string]: unknown;
}

interface ReportsClientProps {
  scheduledReports: ScheduledReport[];
  projectId: string;
}

/* ------------------------------------------------------------------
   Reports Client Component
   ------------------------------------------------------------------ */

export function ReportsClient({
  scheduledReports,
  projectId,
}: ReportsClientProps) {
  const timezone = useTimezone();
  const [activeTab, setActiveTab] = useState("generate");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("full");
  const [selectedSections, setSelectedSections] = useState<ReportSection[]>(
    ["executive", "keywords", "backlinks", "audit", "competitors", "insights"]
  );
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const TEMPLATE_SECTIONS: Record<string, ReportSection[]> = {
    full: ["executive", "keywords", "backlinks", "audit", "competitors", "insights"],
    executive: ["executive", "keywords", "backlinks", "audit", "insights"],
    keywords: ["keywords"],
    backlinks: ["backlinks"],
    audit: ["audit"],
  };

  function handleSelectTemplate(id: string) {
    setSelectedTemplate(id);
    if (TEMPLATE_SECTIONS[id]) {
      setSelectedSections([...TEMPLATE_SECTIONS[id]]);
    }
  }

  function toggleSection(section: ReportSection) {
    setSelectedSections((prev) => {
      const next = prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section];
      // If selection doesn't match any preset, mark as custom
      const matchingTemplate = Object.entries(TEMPLATE_SECTIONS).find(
        ([, sections]) => sections.length === next.length && sections.every((s) => next.includes(s))
      );
      setSelectedTemplate(matchingTemplate ? matchingTemplate[0] : "custom");
      return next;
    });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createScheduledReport(projectId, formData);
      if ("error" in result) {
        setFormError(result.error);
      } else {
        setShowCreateDialog(false);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this scheduled report?")) return;
    setActionId(id);
    startTransition(async () => {
      await deleteScheduledReport(id);
      setActionId(null);
    });
  }

  function handleToggle(id: string, currentActive: boolean) {
    setActionId(id);
    startTransition(async () => {
      await toggleScheduledReport(id, !currentActive);
      setActionId(null);
    });
  }

  async function handleGenerateReport(preview = false) {
    if (preview) setPreviewing(true);
    else setGenerating(true);
    setFormError(null);

    if (selectedSections.length === 0) {
      setFormError("Select at least one section.");
      setGenerating(false);
      setPreviewing(false);
      return;
    }

    try {
      const template = (selectedTemplate === "custom" ? "custom" : selectedTemplate) as "full" | "keywords" | "backlinks" | "audit" | "executive" | "custom";
      const sections = selectedTemplate === "custom" ? selectedSections : undefined;
      const result = await generateReport(projectId, template, sections);
      if ("error" in result) {
        setFormError(result.error);
      } else {
        const byteChars = atob(result.data);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          bytes[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        if (preview) {
          // Open in new tab for preview
          window.open(url, "_blank");
        } else {
          // Download
          const a = document.createElement("a");
          a.href = url;
          a.download = result.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    } catch {
      setFormError("An unexpected error occurred.");
    } finally {
      setGenerating(false);
      setPreviewing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-rule pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">
            Reports & Export
          </h1>
          <p className="mt-1 font-sans text-sm text-ink-secondary">
            Generate, schedule, and export SEO intelligence reports
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus size={14} />
          Create Report
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generate">
            <FileDown size={12} className="mr-1.5" />
            Generate Report
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Clock size={12} className="mr-1.5" />
            Scheduled
          </TabsTrigger>
        </TabsList>

        {/* Generate Report Tab */}
        <TabsContent value="generate">
          <ColumnHeader
            title="Generate Report"
            subtitle="Create an on-demand PDF report for your project"
          />

          {formError && activeTab === "generate" && (
            <div className="mt-4 border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
              {formError}
            </div>
          )}

          {/* Quick Presets */}
          <div className="mt-6">
            <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Quick Presets
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "full", label: "Full Report" },
                { id: "executive", label: "Executive Summary" },
                { id: "keywords", label: "Keywords Only" },
                { id: "backlinks", label: "Backlinks Only" },
                { id: "audit", label: "Site Audit Only" },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`px-3 py-1.5 text-[12px] font-semibold transition-all ${
                    selectedTemplate === tmpl.id
                      ? "bg-ink text-surface-cream"
                      : "border border-rule bg-surface-card text-ink-secondary hover:border-ink-muted hover:text-ink"
                  }`}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section Checkboxes */}
          <div className="mt-6">
            <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Report Sections
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ALL_SECTIONS.map((section) => {
                const isChecked = selectedSections.includes(section.id);
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={`flex items-center gap-3 border p-3 text-left transition-all ${
                      isChecked
                        ? "border-editorial-red/50 bg-editorial-red/5"
                        : "border-rule bg-surface-card hover:border-ink-muted"
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare size={16} className="shrink-0 text-editorial-red" />
                    ) : (
                      <Square size={16} className="shrink-0 text-ink-muted" />
                    )}
                    <span className="text-[13px] font-medium text-ink">{section.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-rule pt-6">
            <Button
              variant="primary"
              size="md"
              onClick={() => handleGenerateReport(false)}
              loading={generating}
              disabled={generating || previewing || selectedSections.length === 0}
            >
              <FileDown size={14} />
              Generate &amp; Download PDF
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => handleGenerateReport(true)}
              loading={previewing}
              disabled={generating || previewing || selectedSections.length === 0}
            >
              <Eye size={14} />
              Preview
            </Button>
            <span className="text-xs text-ink-muted">
              {selectedSections.length} section{selectedSections.length !== 1 ? "s" : ""} selected
            </span>
          </div>
        </TabsContent>

        {/* Scheduled Reports Tab */}
        <TabsContent value="scheduled">
          {scheduledReports.length === 0 ? (
            <EmptyState
              icon={FileDown}
              title="No Reports Generated Yet"
              description="Create your first scheduled report to automatically generate and deliver SEO intelligence reports."
              actionLabel="Create Scheduled Report"
              onAction={() => setShowCreateDialog(true)}
            />
          ) : (
            <>
              <div className="flex items-end justify-between">
                <ColumnHeader
                  title="Scheduled Reports"
                  subtitle="Automated report generation and delivery"
                />
                <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
                  <Plus size={13} />
                  Add Schedule
                </Button>
              </div>
              <div className="mt-4 flex flex-col gap-0">
                {scheduledReports.map((schedule, i) => {
                  const isActive = schedule.active !== false;
                  const recipients = schedule.recipients ?? [];

                  return (
                    <div
                      key={schedule.id}
                      className={`flex items-start gap-4 py-4 ${
                        i < scheduledReports.length - 1 ? "border-b border-rule" : ""
                      }`}
                    >
                      <div
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          isActive ? "bg-editorial-green" : "bg-ink-muted"
                        }`}
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-[15px] font-bold text-ink">
                            {schedule.name ?? "Untitled Report"}
                          </h4>
                          <Badge variant={isActive ? "success" : "muted"}>
                            {isActive ? "Active" : "Paused"}
                          </Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-ink-secondary">
                          {schedule.frequency && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {schedule.frequency}
                              {schedule.day ? ` \u00B7 ${schedule.day}` : ""}
                            </span>
                          )}
                          {schedule.next_run && (
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              Next: {formatDate(schedule.next_run, timezone)}
                            </span>
                          )}
                          {recipients.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Mail size={10} />
                              {recipients.length} recipient{recipients.length > 1 ? "s" : ""}
                            </span>
                          )}
                          {schedule.template && (
                            <span className="flex items-center gap-1">
                              <LayoutTemplate size={10} />
                              {schedule.template}
                            </span>
                          )}
                        </div>

                        {recipients.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {recipients.map((email) => (
                              <span
                                key={email}
                                className="inline-flex items-center bg-surface-raised px-2 py-0.5 font-mono text-[10px] text-ink-muted"
                              >
                                {email}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title={isActive ? "Pause" : "Activate"}
                          disabled={actionId === schedule.id}
                          onClick={() => handleToggle(schedule.id, isActive)}
                        >
                          {actionId === schedule.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Power size={13} className={isActive ? "text-editorial-green" : "text-ink-muted"} />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-ink-muted hover:text-editorial-red"
                          title="Delete"
                          disabled={actionId === schedule.id}
                          onClick={() => handleDelete(schedule.id)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Report Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Scheduled Report</DialogTitle>
            <DialogDescription>
              Set up an automated SEO intelligence report.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="flex flex-col gap-4 p-5">
            {formError && (
              <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
                {formError}
              </div>
            )}

            <Input
              name="name"
              label="Report Name"
              placeholder="Weekly SEO Report"
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Frequency
              </label>
              <select
                name="frequency"
                defaultValue="weekly"
                className="h-10 w-full border border-rule bg-surface-card px-3 text-sm text-ink focus:border-editorial-red focus:outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Template
              </label>
              <select
                name="template"
                defaultValue="full"
                className="h-10 w-full border border-rule bg-surface-card px-3 text-sm text-ink focus:border-editorial-red focus:outline-none"
              >
                <option value="full">Full Report</option>
                <option value="keywords">Keywords Only</option>
                <option value="backlinks">Backlinks Only</option>
                <option value="audit">Site Audit</option>
                <option value="executive">Executive Summary</option>
              </select>
            </div>

            <Input
              name="recipients"
              label="Recipients (comma-separated emails)"
              placeholder="team@company.com, boss@company.com"
            />

            <DialogFooter className="border-t-0 px-0 pb-0">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" loading={isPending}>
                Create Report
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
