"use client";

import { useMemo } from "react";

/**
 * Lightweight renderer for AI-generated markdown text.
 * Handles: **bold**, *italic*, ## headings, - / * list items, numbered lists, `code`.
 * No external dependency needed — covers the patterns LLMs actually produce.
 */
export function AiMarkdown({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => markdownToHtml(content), [content]);

  return (
    <div
      className={`ai-markdown ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const result: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headings: ## or ###
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      if (inList) { result.push(listType === "ol" ? "</ol>" : "</ul>"); inList = false; listType = null; }
      const level = headingMatch[1].length;
      const text = inlineFormat(headingMatch[2]);
      // Map heading levels to editorial-appropriate styles
      if (level <= 2) {
        result.push(`<h4 class="mt-3 mb-1.5 font-serif text-[14px] font-bold text-ink">${text}</h4>`);
      } else {
        result.push(`<h5 class="mt-2 mb-1 font-sans text-[12px] font-bold uppercase tracking-wide text-ink-secondary">${text}</h5>`);
      }
      continue;
    }

    // Unordered list items: - or *  (with optional indentation)
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (ulMatch) {
      const indent = ulMatch[1].length;
      const text = inlineFormat(ulMatch[2]);
      if (!inList || listType !== "ul") {
        if (inList) result.push(listType === "ol" ? "</ol>" : "</ul>");
        result.push(`<ul class="my-1 ml-${indent > 0 ? "5" : "3"} list-disc space-y-0.5">`);
        inList = true;
        listType = "ul";
      }
      result.push(`<li class="text-ink-secondary">${text}</li>`);
      continue;
    }

    // Ordered list items: 1. 2. etc.
    const olMatch = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (olMatch) {
      const text = inlineFormat(olMatch[1]);
      if (!inList || listType !== "ol") {
        if (inList) result.push(listType === "ol" ? "</ol>" : "</ul>");
        result.push('<ol class="my-1 ml-3 list-decimal space-y-0.5">');
        inList = true;
        listType = "ol";
      }
      result.push(`<li class="text-ink-secondary">${text}</li>`);
      continue;
    }

    // Close any open list
    if (inList) {
      result.push(listType === "ol" ? "</ol>" : "</ul>");
      inList = false;
      listType = null;
    }

    // Empty line → spacing
    if (line.trim() === "") {
      result.push('<div class="h-2"></div>');
      continue;
    }

    // Normal paragraph
    result.push(`<p class="text-ink-secondary">${inlineFormat(line)}</p>`);
  }

  // Close any remaining open list
  if (inList) {
    result.push(listType === "ol" ? "</ol>" : "</ul>");
  }

  return result.join("\n");
}

/** Handle inline formatting: **bold**, *italic*, `code` */
function inlineFormat(text: string): string {
  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-ink">$1</strong>')
    .replace(/__(.+?)__/g, '<strong class="font-semibold text-ink">$1</strong>')
    // Italic: *text* or _text_ (but not inside **)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Inline code: `text`
    .replace(/`(.+?)`/g, '<code class="bg-surface-raised px-1 py-0.5 font-mono text-[10px] text-ink">$1</code>');
}
