/**
 * Strip common markdown formatting characters from AI-generated text.
 * Converts markdown to clean plain text for React Native display.
 */
export function stripMarkdown(text: string): string {
  return text
    // Remove heading markers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    // Remove italic *text* or _text_
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/(?<!\w)_([^_]+)_(?!\w)/g, "$1")
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    // Remove links [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Convert markdown bullets to plain bullets
    .replace(/^\s*[-*+]\s+/gm, "\u2022 ")
    // Remove horizontal rules (---, ***, ___)
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Remove blockquote markers
    .replace(/^>\s+/gm, "")
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
