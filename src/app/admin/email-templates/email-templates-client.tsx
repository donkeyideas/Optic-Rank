"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Eye,
  Send,
  Pencil,
  X,
  Mail,
  Shield,
  Clock,
  Bell,
  FileText,
  Check,
  Loader2,
  MonitorSmartphone,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/*  Template registry                                                  */
/* ------------------------------------------------------------------ */

interface EmailTemplate {
  id: string;
  name: string;
  category: "transactional" | "lifecycle" | "notification" | "auth";
  description: string;
  trigger: string;
  subject: string;
  canSendTest: boolean;
}

const templates: EmailTemplate[] = [
  {
    id: "welcome",
    name: "Welcome Email",
    category: "transactional",
    description: "Sent to new users after they create an account.",
    trigger: "User signs up",
    subject: "Welcome to Optic Rank",
    canSendTest: true,
  },
  {
    id: "contact-confirmation",
    name: "Contact Confirmation",
    category: "transactional",
    description: "Confirms receipt of a contact form submission.",
    trigger: "Contact form submitted",
    subject: "We received your message — Optic Rank",
    canSendTest: true,
  },
  {
    id: "notification",
    name: "Notification Alert",
    category: "notification",
    description: "Generic notification for rank changes, audit results, backlinks, and AI insights.",
    trigger: "System event dispatched",
    subject: "[Event Title] — Optic Rank",
    canSendTest: true,
  },
  {
    id: "report",
    name: "Report Delivery",
    category: "notification",
    description: "Delivers scheduled SEO reports with PDF attachment.",
    trigger: "Scheduled report generated",
    subject: "Your SEO Report is Ready — Optic Rank",
    canSendTest: true,
  },
  {
    id: "trial-expiring",
    name: "Trial Expiring",
    category: "lifecycle",
    description: "Reminds users their free trial is ending soon.",
    trigger: "3 days before trial end",
    subject: "Your trial ends in 3 days — Optic Rank",
    canSendTest: true,
  },
  {
    id: "trial-expired",
    name: "Trial Expired",
    category: "lifecycle",
    description: "Notifies users their trial has ended and prompts upgrade.",
    trigger: "Trial end date passed",
    subject: "Your free trial has ended — Optic Rank",
    canSendTest: true,
  },
  {
    id: "password-reset",
    name: "Password Reset",
    category: "auth",
    description: "Allows users to reset their password via a secure link.",
    trigger: "Forgot password requested",
    subject: "Reset your password — Optic Rank",
    canSendTest: false,
  },
  {
    id: "email-confirmation",
    name: "Email Confirmation",
    category: "auth",
    description: "Verifies the user's email address after signup.",
    trigger: "Account created (if email confirm enabled)",
    subject: "Confirm your email — Optic Rank",
    canSendTest: false,
  },
  {
    id: "magic-link",
    name: "Magic Link",
    category: "auth",
    description: "One-click passwordless sign-in link.",
    trigger: "Passwordless login requested",
    subject: "Your sign-in link — Optic Rank",
    canSendTest: false,
  },
  {
    id: "invite",
    name: "Team Invite",
    category: "auth",
    description: "Invites a new user to join an organization.",
    trigger: "Admin invites team member",
    subject: "You've been invited — Optic Rank",
    canSendTest: false,
  },
  {
    id: "email-change",
    name: "Email Change",
    category: "auth",
    description: "Confirms when a user changes their email address.",
    trigger: "Email change requested",
    subject: "Confirm email change — Optic Rank",
    canSendTest: false,
  },
];

const categoryConfig = {
  transactional: { label: "Transactional", icon: Mail, color: "text-editorial-red" },
  lifecycle: { label: "Lifecycle", icon: Clock, color: "text-amber-600" },
  notification: { label: "Notification", icon: Bell, color: "text-blue-600" },
  auth: { label: "Authentication", icon: Shield, color: "text-emerald-600" },
};

const categories = ["transactional", "lifecycle", "notification", "auth"] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EmailTemplatesClient() {
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [editHtml, setEditHtml] = useState<string>("");
  const [editSubject, setEditSubject] = useState<string>("");
  const [editLoading, setEditLoading] = useState(false);

  const [sendTestTemplate, setSendTestTemplate] = useState<EmailTemplate | null>(null);
  const [sendTestEmail, setSendTestEmail] = useState("");
  const [sendTestLoading, setSendTestLoading] = useState(false);
  const [sendTestResult, setSendTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editIframeRef = useRef<HTMLIFrameElement>(null);

  /* ---------------------------------------------------------------- */
  /*  Preview                                                          */
  /* ---------------------------------------------------------------- */

  const openPreview = useCallback(async (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setPreviewLoading(true);
    setPreviewHtml("");
    setPreviewDevice("desktop");
    try {
      const res = await fetch(`/api/admin/email-templates/preview?id=${template.id}`);
      const data = await res.json();
      if (data.html) setPreviewHtml(data.html);
    } catch {
      setPreviewHtml("<p>Failed to load preview.</p>");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewTemplate(null);
    setPreviewHtml("");
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Edit                                                             */
  /* ---------------------------------------------------------------- */

  const openEdit = useCallback(async (template: EmailTemplate) => {
    setEditTemplate(template);
    setEditLoading(true);
    setEditSubject(template.subject);
    try {
      const res = await fetch(`/api/admin/email-templates/preview?id=${template.id}`);
      const data = await res.json();
      if (data.html) setEditHtml(data.html);
      if (data.subject) setEditSubject(data.subject);
    } catch {
      setEditHtml("<p>Failed to load template.</p>");
    } finally {
      setEditLoading(false);
    }
  }, []);

  const closeEdit = useCallback(() => {
    setEditTemplate(null);
    setEditHtml("");
    setEditSubject("");
  }, []);

  // Update edit iframe when editHtml changes
  useEffect(() => {
    if (editIframeRef.current && editHtml) {
      const doc = editIframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(editHtml);
        doc.close();
      }
    }
  }, [editHtml]);

  // Update preview iframe when previewHtml changes
  useEffect(() => {
    if (iframeRef.current && previewHtml) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [previewHtml]);

  /* ---------------------------------------------------------------- */
  /*  Send Test                                                        */
  /* ---------------------------------------------------------------- */

  const openSendTest = useCallback((template: EmailTemplate) => {
    setSendTestTemplate(template);
    setSendTestResult(null);
    setSendTestEmail("");
  }, []);

  const closeSendTest = useCallback(() => {
    setSendTestTemplate(null);
    setSendTestResult(null);
  }, []);

  const handleSendTest = useCallback(async () => {
    if (!sendTestTemplate || !sendTestEmail) return;
    setSendTestLoading(true);
    setSendTestResult(null);
    try {
      const res = await fetch("/api/admin/email-templates/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: sendTestTemplate.id, email: sendTestEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendTestResult({ success: true, message: `Test email sent to ${sendTestEmail}` });
      } else {
        setSendTestResult({ success: false, message: data.error ?? "Failed to send" });
      }
    } catch {
      setSendTestResult({ success: false, message: "Network error" });
    } finally {
      setSendTestLoading(false);
    }
  }, [sendTestTemplate, sendTestEmail]);

  /* ---------------------------------------------------------------- */
  /*  Stats                                                            */
  /* ---------------------------------------------------------------- */

  const totalTemplates = templates.length;
  const sendableTemplates = templates.filter((t) => t.canSendTest).length;
  const authTemplates = templates.filter((t) => t.category === "auth").length;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          Email Templates
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Preview and manage all system emails. Auth templates are managed via Supabase Dashboard.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Total Templates
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {totalTemplates}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <FileText size={18} strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Sendable
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {sendableTemplates}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Send size={18} strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Auth Templates
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {authTemplates}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Shield size={18} strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Categories
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {categories.length}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Mail size={18} strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template list by category */}
      {categories.map((cat) => {
        const config = categoryConfig[cat];
        const Icon = config.icon;
        const catTemplates = templates.filter((t) => t.category === cat);
        if (catTemplates.length === 0) return null;

        return (
          <div key={cat}>
            <div className="mb-3 flex items-center gap-2">
              <Icon size={16} strokeWidth={1.5} className={config.color} />
              <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                {config.label}
              </h2>
              <span className="text-[10px] text-ink-faint">({catTemplates.length})</span>
            </div>

            <div className="border border-rule">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-rule bg-surface-raised">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      Template
                    </th>
                    <th className="hidden px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted md:table-cell">
                      Subject
                    </th>
                    <th className="hidden px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted lg:table-cell">
                      Trigger
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {catTemplates.map((template) => (
                    <tr
                      key={template.id}
                      className="border-b border-rule last:border-b-0 hover:bg-surface-raised/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-ink">{template.name}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{template.description}</p>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <p className="font-mono text-xs text-ink-secondary">{template.subject}</p>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <p className="text-xs text-ink-muted">{template.trigger}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openPreview(template)}
                            className="inline-flex h-8 w-8 items-center justify-center border border-rule bg-surface-card text-ink-secondary hover:bg-surface-raised hover:text-ink transition-colors"
                            title="Preview"
                          >
                            <Eye size={14} strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => openEdit(template)}
                            className="inline-flex h-8 w-8 items-center justify-center border border-rule bg-surface-card text-ink-secondary hover:bg-surface-raised hover:text-ink transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} strokeWidth={1.5} />
                          </button>
                          {template.canSendTest && (
                            <button
                              onClick={() => openSendTest(template)}
                              className="inline-flex h-8 w-8 items-center justify-center border border-rule bg-surface-card text-ink-secondary hover:bg-surface-raised hover:text-ink transition-colors"
                              title="Send Test"
                            >
                              <Send size={14} strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* ============================================================ */}
      {/*  PREVIEW MODAL                                                */}
      {/* ============================================================ */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div
            className="relative mx-4 flex max-h-[92vh] w-full max-w-3xl flex-col border border-rule bg-surface-cream shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-rule px-6 py-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-red">
                  Preview
                </p>
                <h3 className="font-serif text-lg font-bold text-ink">
                  {previewTemplate.name}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-ink-muted">
                  Subject: {previewTemplate.subject}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Device toggle */}
                <div className="flex border border-rule">
                  <button
                    onClick={() => setPreviewDevice("desktop")}
                    className={`inline-flex h-8 w-8 items-center justify-center transition-colors ${
                      previewDevice === "desktop"
                        ? "bg-ink text-surface-cream"
                        : "bg-surface-card text-ink-secondary hover:bg-surface-raised"
                    }`}
                    title="Desktop"
                  >
                    <Monitor size={14} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`inline-flex h-8 w-8 items-center justify-center border-l border-rule transition-colors ${
                      previewDevice === "mobile"
                        ? "bg-ink text-surface-cream"
                        : "bg-surface-card text-ink-secondary hover:bg-surface-raised"
                    }`}
                    title="Mobile"
                  >
                    <Smartphone size={14} strokeWidth={1.5} />
                  </button>
                </div>
                <button
                  onClick={closePreview}
                  className="inline-flex h-8 w-8 items-center justify-center border border-rule bg-surface-card text-ink-secondary hover:bg-surface-raised hover:text-ink"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-auto bg-[#e5e1dc] p-6">
              {previewLoading ? (
                <div className="flex h-96 items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-ink-muted" />
                </div>
              ) : (
                <div
                  className="mx-auto transition-all duration-300"
                  style={{
                    width: previewDevice === "mobile" ? "375px" : "100%",
                    maxWidth: "100%",
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    title="Email Preview"
                    className="w-full border-0 bg-white"
                    style={{
                      height: "600px",
                      borderRadius: previewDevice === "mobile" ? "16px" : "0",
                      boxShadow: previewDevice === "mobile"
                        ? "0 8px 32px rgba(0,0,0,0.15)"
                        : "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between border-t border-rule px-6 py-3">
              <p className="text-xs text-ink-muted">
                {previewTemplate.canSendTest
                  ? "This is a preview with sample data."
                  : "Auth template — managed via Supabase Dashboard."}
              </p>
              <div className="flex items-center gap-2">
                {previewTemplate.canSendTest && (
                  <button
                    onClick={() => {
                      closePreview();
                      openSendTest(previewTemplate);
                    }}
                    className="inline-flex h-9 items-center gap-2 border border-rule bg-surface-card px-4 text-xs font-semibold uppercase tracking-wider text-ink-secondary hover:bg-surface-raised hover:text-ink transition-colors"
                  >
                    <Send size={12} strokeWidth={1.5} />
                    Send Test
                  </button>
                )}
                <button
                  onClick={closePreview}
                  className="inline-flex h-9 items-center gap-2 bg-ink px-4 text-xs font-semibold uppercase tracking-wider text-surface-cream hover:bg-ink/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  EDIT MODAL                                                   */}
      {/* ============================================================ */}
      {editTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeEdit}
        >
          <div
            className="relative mx-4 flex max-h-[92vh] w-full max-w-6xl flex-col border border-rule bg-surface-cream shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-rule px-6 py-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-red">
                  Edit Template
                </p>
                <h3 className="font-serif text-lg font-bold text-ink">
                  {editTemplate.name}
                </h3>
              </div>
              <button
                onClick={closeEdit}
                className="inline-flex h-8 w-8 items-center justify-center border border-rule bg-surface-card text-ink-secondary hover:bg-surface-raised hover:text-ink"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Modal body — split view */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left: Editor */}
              <div className="flex w-1/2 flex-col border-r border-rule">
                <div className="border-b border-rule px-4 py-3">
                  <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="mt-1 block w-full border border-rule bg-surface-card px-3 py-2 font-mono text-sm text-ink outline-none focus:border-editorial-red"
                  />
                </div>
                <div className="flex items-center justify-between border-b border-rule px-4 py-2">
                  <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    HTML Source
                  </label>
                  <span className="text-[9px] text-ink-faint">
                    {editTemplate.category === "auth"
                      ? "Auth templates use {{ .ConfirmationURL }} variables"
                      : "Template functions render this HTML"}
                  </span>
                </div>
                <div className="flex-1 overflow-auto">
                  {editLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 size={24} className="animate-spin text-ink-muted" />
                    </div>
                  ) : (
                    <textarea
                      value={editHtml}
                      onChange={(e) => setEditHtml(e.target.value)}
                      className="h-full w-full resize-none border-none bg-[#1e1e1e] p-4 font-mono text-xs leading-relaxed text-green-400 outline-none"
                      spellCheck={false}
                    />
                  )}
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="flex w-1/2 flex-col">
                <div className="flex items-center justify-between border-b border-rule px-4 py-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Live Preview
                  </span>
                  <MonitorSmartphone size={14} className="text-ink-faint" />
                </div>
                <div className="flex-1 overflow-auto bg-[#e5e1dc] p-4">
                  <iframe
                    ref={editIframeRef}
                    title="Edit Preview"
                    className="h-full w-full border-0 bg-white"
                    style={{ minHeight: "500px" }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between border-t border-rule px-6 py-3">
              <p className="text-xs text-ink-muted">
                {editTemplate.category === "auth"
                  ? "Copy the HTML and paste it in Supabase Dashboard > Auth > Email Templates."
                  : "Template source is generated by code. Modify the template files in src/lib/email/templates/."}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(editHtml);
                  }}
                  className="inline-flex h-9 items-center gap-2 border border-rule bg-surface-card px-4 text-xs font-semibold uppercase tracking-wider text-ink-secondary hover:bg-surface-raised hover:text-ink transition-colors"
                >
                  Copy HTML
                </button>
                <button
                  onClick={closeEdit}
                  className="inline-flex h-9 items-center gap-2 bg-ink px-4 text-xs font-semibold uppercase tracking-wider text-surface-cream hover:bg-ink/90 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  SEND TEST MODAL                                              */}
      {/* ============================================================ */}
      {sendTestTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeSendTest}
        >
          <div
            className="relative mx-4 w-full max-w-md border border-rule bg-surface-cream shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-rule px-6 py-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-red">
                  Send Test Email
                </p>
                <h3 className="font-serif text-lg font-bold text-ink">
                  {sendTestTemplate.name}
                </h3>
              </div>
              <button
                onClick={closeSendTest}
                className="inline-flex h-8 w-8 items-center justify-center border border-rule bg-surface-card text-ink-secondary hover:bg-surface-raised hover:text-ink"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">
              <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Recipient Email
              </label>
              <input
                type="email"
                value={sendTestEmail}
                onChange={(e) => setSendTestEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 block w-full border border-rule bg-surface-card px-3 py-2.5 text-sm text-ink outline-none focus:border-editorial-red placeholder:text-ink-faint"
                autoFocus
              />

              <p className="mt-3 text-xs text-ink-muted">
                Subject will be prefixed with <span className="font-mono text-ink-secondary">[TEST]</span> to distinguish from real emails.
              </p>

              {sendTestResult && (
                <div
                  className={`mt-4 flex items-center gap-2 border px-4 py-3 text-sm ${
                    sendTestResult.success
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {sendTestResult.success ? (
                    <Check size={14} strokeWidth={2} />
                  ) : (
                    <X size={14} strokeWidth={2} />
                  )}
                  {sendTestResult.message}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 border-t border-rule px-6 py-3">
              <button
                onClick={closeSendTest}
                className="inline-flex h-9 items-center gap-2 border border-rule bg-surface-card px-4 text-xs font-semibold uppercase tracking-wider text-ink-secondary hover:bg-surface-raised hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={sendTestLoading || !sendTestEmail}
                className="inline-flex h-9 items-center gap-2 bg-editorial-red px-5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-editorial-red/90 transition-colors disabled:opacity-50"
              >
                {sendTestLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={12} strokeWidth={1.5} />
                )}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
