/**
 * Input capabilities for Cursor models. The Cursor IDE catalog's
 * `supportsImages` is authoritative; this covers models it does not list.
 */
export function supportsCursorImages(modelId: string): boolean {
  const id = modelId.startsWith("cursor-") ? modelId.slice("cursor-".length) : modelId;

  if (id === "auto") return true;
  if (id.startsWith("composer-")) return false;
  if (id.startsWith("grok-")) return !id.startsWith("grok-4.7");

  if (
    id.startsWith("claude-")
    || id.startsWith("gpt-")
    || id.startsWith("gemini-")
    || id.startsWith("kimi-")
    || id.startsWith("glm-")
    || id.startsWith("muse-")
    || id.startsWith("deepseek-v41")
  ) {
    return true;
  }

  return false;
}
