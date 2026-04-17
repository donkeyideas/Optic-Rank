"use client";

import { useState, useRef, useCallback } from "react";
import { createPost, updatePost, deletePost, generateBlogWithAI } from "@/lib/actions/posts";
import {
  Bold,
  Italic,
  Link,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Image,
  Unlink,
} from "lucide-react";

type Post = {
  id: string;
  type: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author_name: string | null;
  status: string;
  tags: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export function BlogClient({
  blogPosts,
  guides,
}: {
  blogPosts: Post[];
  guides: Post[];
}) {
  const [tab, setTab] = useState<"blog" | "guide">("blog");
  const [editing, setEditing] = useState<Post | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTarget, setLinkTarget] = useState<"_blank" | "_self">("_blank");
  const [linkRel, setLinkRel] = useState("noopener noreferrer");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedSelection = useRef<{ start: number; end: number } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [tagsInput, setTagsInput] = useState("");
  const [backlink, setBacklink] = useState("");

  const posts = tab === "blog" ? blogPosts : guides;

  // Publishing cadence stats
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Monday
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const allPublished = [...blogPosts, ...guides].filter(
    (p) => p.status === "published" && p.published_at
  );
  const publishedThisWeek = allPublished.filter((p) => {
    const d = new Date(p.published_at!);
    return d >= weekStart && d < weekEnd;
  });
  const WEEKLY_LIMIT = 2;
  const BEST_DAYS = ["Monday", "Thursday"];

  /* ─── Toolbar helpers ─── */
  const wrapSelection = useCallback(
    (before: string, after: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = content.substring(start, end);
      const replacement = `${before}${selected || "text"}${after}`;
      const updated = content.substring(0, start) + replacement + content.substring(end);
      setContent(updated);
      requestAnimationFrame(() => {
        ta.focus();
        const cursorPos = start + before.length + (selected || "text").length;
        ta.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [content]
  );

  function handleInsertLink() {
    const ta = textareaRef.current;
    if (!ta) return;
    savedSelection.current = { start: ta.selectionStart, end: ta.selectionEnd };
    setLinkUrl("");
    setLinkTarget("_blank");
    setLinkRel("noopener noreferrer");
    setShowLinkDialog(true);
  }

  function confirmInsertLink() {
    const ta = textareaRef.current;
    if (!ta || !linkUrl.trim()) return;
    const sel = savedSelection.current ?? { start: ta.selectionStart, end: ta.selectionEnd };
    const selected = content.substring(sel.start, sel.end) || "link text";
    const relAttr = linkRel.trim() ? ` rel="${linkRel.trim()}"` : "";
    const targetAttr = linkTarget === "_blank" ? ` target="_blank"` : "";
    const tag = `<a href="${linkUrl.trim()}"${targetAttr}${relAttr}>${selected}</a>`;
    const updated = content.substring(0, sel.start) + tag + content.substring(sel.end);
    setContent(updated);
    setShowLinkDialog(false);
    requestAnimationFrame(() => ta.focus());
  }

  function handleInsertImage() {
    const url = prompt("Image URL:");
    if (!url) return;
    const alt = prompt("Alt text (for SEO):") || "";
    wrapSelection("", `\n<img src="${url}" alt="${alt}" loading="lazy" />\n`);
  }

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setTitle("");
    setSlug("");
    setExcerpt("");
    setContent("");
    setStatus("draft");
    setTagsInput("");
    setBacklink("");
    setError("");
    setShowPreview(false);
  }

  function openEdit(post: Post) {
    setCreating(false);
    setEditing(post);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt ?? "");
    setContent(post.content);
    setStatus(post.status as "draft" | "published");
    setTagsInput(Array.isArray(post.tags) ? post.tags.join(", ") : "");
    setBacklink("");
    setError("");
    setShowPreview(false);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setError("");
    setShowPreview(false);
  }

  function generateSlug(text: string) {
    const STOP_WORDS = new Set(["a","an","the","and","or","but","in","on","at","to","for","of","with","by","from","is","it","that","this","was","are","be","has","had","have","will","can","your","you","we","our","its","do","does","what","how","why","when","where","which","who"]);
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, "")
      .split(/\s+/)
      .filter(w => w && !STOP_WORDS.has(w));
    return words.slice(0, 5).join("-") || "untitled";
  }

  async function handleGenerate() {
    if (!title.trim()) {
      setError("Please enter a title first, then click Generate with AI.");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const result = await generateBlogWithAI(title, tab, backlink.trim() || undefined);

      if ("error" in result) {
        setError(result.error);
      } else {
        setContent(result.content);
        if (result.excerpt) setExcerpt(result.excerpt);
        if (result.tags.length > 0) setTagsInput(result.tags.join(", "));
        if (creating && !slug) setSlug(generateSlug(title));
        setShowPreview(true);
      }
    } catch {
      setError("AI generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setLoading(true);
    setError("");

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (creating) {
        const result = await createPost({
          type: tab,
          title,
          slug: slug || generateSlug(title),
          excerpt: excerpt || undefined,
          content,
          status,
          tags,
        });
        if ("error" in result) {
          setError(result.error);
        } else {
          closeForm();
          window.location.reload();
        }
      } else if (editing) {
        const result = await updatePost(editing.id, {
          title,
          slug,
          excerpt: excerpt || undefined,
          content,
          status,
          tags,
        });
        if ("error" in result) {
          setError(result.error);
        } else {
          closeForm();
          window.location.reload();
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    const result = await deletePost(id);
    if ("error" in result) {
      alert(result.error);
    } else {
      window.location.reload();
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">
            Blog & Guides
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Manage blog posts and guides published on the marketing site.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex h-9 items-center justify-center bg-editorial-red px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-editorial-red/90"
        >
          New {tab === "blog" ? "Post" : "Guide"}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-rule">
        {(["blog", "guide"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              closeForm();
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-editorial-red text-ink"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t === "blog" ? "Blog Posts" : "Guides"}
          </button>
        ))}
      </div>

      {/* Publishing Schedule */}
      <div className="mb-6 border border-rule bg-surface-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">
            Weekly Publishing Cadence
          </span>
          <span className="text-xs text-ink-muted">
            Best days:{" "}
            <strong className="text-ink">{BEST_DAYS.join(" & ")}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden bg-surface-raised">
            <div
              className={`h-full transition-all ${
                publishedThisWeek.length > WEEKLY_LIMIT
                  ? "bg-editorial-red"
                  : publishedThisWeek.length === WEEKLY_LIMIT
                    ? "bg-editorial-green"
                    : "bg-editorial-gold"
              }`}
              style={{
                width: `${Math.min((publishedThisWeek.length / WEEKLY_LIMIT) * 100, 100)}%`,
              }}
            />
          </div>
          <span
            className={`text-sm font-bold tabular-nums ${
              publishedThisWeek.length > WEEKLY_LIMIT
                ? "text-editorial-red"
                : "text-ink"
            }`}
          >
            {publishedThisWeek.length}/{WEEKLY_LIMIT}
          </span>
        </div>
        <p className="mt-2 text-[10px] text-ink-muted">
          {publishedThisWeek.length === 0
            ? "No posts this week. Publish 1 quality post on Monday and 1 on Thursday for optimal SEO crawl frequency."
            : publishedThisWeek.length <= WEEKLY_LIMIT
              ? "On track. Consistent 2x/week publishing builds topical authority faster than batch publishing."
              : "Over-publishing. Google's freshness signals work best with steady cadence, not bursts. Spread posts across weeks."}
        </p>
      </div>

      {/* Create/Edit Form */}
      {(creating || editing) && (
        <div className="mb-6 border border-rule bg-surface-card p-6">
          <h2 className="mb-4 font-serif text-lg font-bold text-ink">
            {creating ? `New ${tab === "blog" ? "Blog Post" : "Guide"}` : "Edit Post"}
          </h2>

          <div className="space-y-4">
            {/* Title + Generate with AI */}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                Title
              </label>
              <div className="flex gap-2">
                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (creating) setSlug(generateSlug(e.target.value));
                  }}
                  className="flex-1 border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  placeholder="Enter a title..."
                />
                <button
                  onClick={handleGenerate}
                  disabled={generating || !title.trim()}
                  className="inline-flex items-center gap-2 bg-editorial-red px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-editorial-red/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Generate with AI
                    </>
                  )}
                </button>
              </div>
              {generating && (
                <p className="mt-2 text-xs text-ink-muted">
                  AI is writing your {tab === "blog" ? "blog post" : "guide"} optimized for SEO, GEO, AEO, and CRO. This may take 30-60 seconds...
                </p>
              )}
            </div>

            {/* Backlink (optional) */}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                Backlink <span className="normal-case tracking-normal text-ink-muted/60">(optional)</span>
              </label>
              <input
                value={backlink}
                onChange={(e) => setBacklink(e.target.value)}
                className="w-full border border-rule bg-surface-cream px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none"
                placeholder="https://example.com — AI will naturally link to this URL in the post"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                Slug
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full border border-rule bg-surface-cream px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                Excerpt
              </label>
              <input
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                placeholder="Short description..."
              />
            </div>

            {/* Content with Preview Toggle */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                  Content
                </label>
                {content && (
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs font-medium text-editorial-red hover:underline"
                  >
                    {showPreview ? "Edit HTML" : "Preview"}
                  </button>
                )}
              </div>
              {showPreview ? (
                <div
                  className="prose-editorial min-h-[300px] max-h-[600px] overflow-y-auto border border-rule bg-surface-cream p-6 text-sm leading-relaxed text-ink [&_a]:text-editorial-red [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-rule [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-muted [&_em]:italic [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-ink [&_li]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              ) : (
                <div>
                  {/* Formatting toolbar */}
                  <div className="flex flex-wrap items-center gap-0.5 border border-b-0 border-rule bg-surface-raised px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => wrapSelection("<strong>", "</strong>")}
                      className="rounded p-1.5 text-ink-muted hover:bg-surface-cream hover:text-ink"
                      title="Bold"
                    >
                      <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => wrapSelection("<em>", "</em>")}
                      className="rounded p-1.5 text-ink-muted hover:bg-surface-cream hover:text-ink"
                      title="Italic"
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </button>

                    <span className="mx-1 h-4 w-px bg-rule" />

                    <button
                      type="button"
                      onClick={handleInsertLink}
                      className="rounded p-1.5 text-ink-muted hover:bg-surface-cream hover:text-editorial-red"
                      title="Insert Link (backlink)"
                    >
                      <Link className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const ta = textareaRef.current;
                        if (!ta) return;
                        const start = ta.selectionStart;
                        const end = ta.selectionEnd;
                        // Find and remove surrounding <a> tag
                        const before = content.substring(0, start);
                        const after = content.substring(end);
                        const full = content.substring(0, end);
                        const openMatch = before.match(/<a\s[^>]*>(?=[^<]*$)/);
                        const closeIdx = after.indexOf("</a>");
                        if (openMatch && closeIdx !== -1) {
                          const tagStart = before.lastIndexOf(openMatch[0]);
                          const tagEnd = end + closeIdx + 4;
                          const inner = content.substring(tagStart + openMatch[0].length, end + closeIdx);
                          setContent(content.substring(0, tagStart) + inner + content.substring(tagEnd));
                        }
                      }}
                      className="rounded p-1.5 text-ink-muted hover:bg-surface-cream hover:text-editorial-red"
                      title="Remove Link"
                    >
                      <Unlink className="h-3.5 w-3.5" />
                    </button>

                    <span className="mx-1 h-4 w-px bg-rule" />

                    <button
                      type="button"
                      onClick={() => wrapSelection("\n<h2>", "</h2>\n")}
                      className="rounded p-1.5 text-ink-muted hover:bg-surface-cream hover:text-ink"
                      title="Heading 2"
                    >
                      <Heading2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => wrapSelection("\n<h3>", "</h3>\n")}
                      className="rounded p-1.5 text-ink-muted hover:bg-surface-cream hover:text-ink"
                      title="Heading 3"
                    >
                      <Heading3 className="h-3.5 w-3.5" />
                    </button>

                    <span className="mx-1 h-4 w-px bg-rule" />

                    <button
                      type="button"
                      onClick={() => wrapSelection("\n<ul>\n  <li>", "</li>\n</ul>\n")}
                      className="rounded p-1.5 text-ink-muted hover:bg-surface-cream hover:text-ink"
                      title="Bullet List"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => wrapSelection("\n<ol>\n  <li>", "</li>\n</ol>\n")}
                      className="rounded p-1.5 text-ink-muted hover:bg-surface-cream hover:text-ink"
                      title="Numbered List"
                    >
                      <ListOrdered className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => wrapSelection("\n<blockquote>", "</blockquote>\n")}
                      className="rounded p-1.5 text-ink-muted hover:bg-surface-cream hover:text-ink"
                      title="Blockquote"
                    >
                      <Quote className="h-3.5 w-3.5" />
                    </button>

                    <span className="mx-1 h-4 w-px bg-rule" />

                    <button
                      type="button"
                      onClick={handleInsertImage}
                      className="rounded p-1.5 text-ink-muted hover:bg-surface-cream hover:text-ink"
                      title="Insert Image"
                    >
                      <Image className="h-3.5 w-3.5" />
                    </button>

                    <span className="mx-1 h-4 w-px bg-rule" />

                    <button
                      type="button"
                      onClick={() => wrapSelection("<p>", "</p>")}
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted hover:bg-surface-cream hover:text-ink"
                      title="Paragraph"
                    >
                      P
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={16}
                    className="w-full border border-rule bg-surface-cream px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                    placeholder="Write your content or use Generate with AI... Select text and use the toolbar to format."
                  />
                </div>
              )}

              {/* Link insertion dialog */}
              {showLinkDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="w-full max-w-md border border-rule bg-surface-card p-6 shadow-xl">
                    <h3 className="mb-4 font-serif text-lg font-bold text-ink">Insert Link</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                          URL
                        </label>
                        <input
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          className="w-full border border-rule bg-surface-cream px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none"
                          placeholder="https://example.com"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && confirmInsertLink()}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                            Target
                          </label>
                          <select
                            value={linkTarget}
                            onChange={(e) => setLinkTarget(e.target.value as "_blank" | "_self")}
                            className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                          >
                            <option value="_blank">New tab (_blank)</option>
                            <option value="_self">Same tab (_self)</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                            Rel attribute
                          </label>
                          <select
                            value={linkRel}
                            onChange={(e) => setLinkRel(e.target.value)}
                            className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                          >
                            <option value="noopener noreferrer">noopener noreferrer</option>
                            <option value="nofollow noopener noreferrer">nofollow noopener</option>
                            <option value="dofollow">dofollow (pass SEO juice)</option>
                            <option value="">None</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-[10px] text-ink-muted">
                        Use &quot;dofollow&quot; for backlinks you want to pass SEO authority. Use &quot;nofollow&quot; for sponsored or untrusted links.
                      </p>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => setShowLinkDialog(false)}
                        className="inline-flex h-8 items-center border border-rule px-4 text-xs font-bold uppercase tracking-widest text-ink-muted hover:text-ink"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmInsertLink}
                        disabled={!linkUrl.trim()}
                        className="inline-flex h-8 items-center bg-editorial-red px-4 text-xs font-bold uppercase tracking-widest text-white hover:bg-editorial-red/90 disabled:opacity-50"
                      >
                        Insert Link
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                  Tags (comma-separated)
                </label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                  placeholder="seo, strategy"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-muted">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                  className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-editorial-red">{error}</p>}

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
      )}

      {/* Table */}
      <div className="border border-rule">
        <table className="w-full">
          <thead>
            <tr className="border-b border-rule bg-surface-raised text-left">
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">
                Title
              </th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">
                Date
              </th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-muted">
                  No {tab === "blog" ? "blog posts" : "guides"} yet.
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-rule last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-ink">
                      {post.title}
                    </div>
                    <div className="font-mono text-xs text-ink-muted">
                      /{tab}/{post.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                        post.status === "published"
                          ? "bg-editorial-green/10 text-editorial-green"
                          : "bg-surface-raised text-ink-muted"
                      }`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString()
                      : new Date(post.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(post)}
                        className="text-xs font-medium text-editorial-red hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-xs font-medium text-ink-muted hover:text-editorial-red"
                      >
                        Delete
                      </button>
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
