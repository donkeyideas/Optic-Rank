/**
 * Parse JSON emitted by an LLM, tolerating the common ways models break strict
 * JSON even in "JSON mode":
 *   - markdown code fences (```json … ```)
 *   - prose before/after the JSON payload
 *   - trailing commas before } or ]
 *
 * Extracts the first balanced object/array so surrounding text is ignored, then
 * repairs trailing commas before parsing. Throws with a descriptive message if
 * no valid JSON can be recovered.
 */
export function parseAiJson<T = unknown>(raw: string | null | undefined): T {
  if (!raw || typeof raw !== "string") {
    throw new Error("Empty AI response");
  }

  let text = raw.trim();

  // 1) Unwrap a markdown code fence if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  // 2) Narrow to the outermost JSON value: first { or [ to its matching bracket,
  //    tracking string state so brackets inside strings don't count.
  const start = text.search(/[{[]/);
  if (start === -1) {
    throw new Error("No JSON object or array found in AI response");
  }
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let end = -1;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  // If unbalanced (e.g. truncated output), keep what we have and let parse fail.
  let candidate = end !== -1 ? text.slice(start, end + 1) : text.slice(start);

  // 3) Remove trailing commas before a closing brace/bracket.
  candidate = candidate.replace(/,(\s*[}\]])/g, "$1");

  try {
    return JSON.parse(candidate) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse AI JSON response: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
