/**
 * Context windows for Cursor models.
 *
 * Cursor's SDK does not expose a per-model context window. `cursor-agent`
 * prints the window in some display names ("GPT-5.5 1M High"), and the Cursor
 * IDE state database has the exact values. The IDE catalog is preferred when
 * available; this module supplies the label parser and a conservative family
 * fallback for headless installs.
 */

export const DEFAULT_CURSOR_CONTEXT = 200_000;

const WINDOW_LABEL = /(?:^|[^\d])(\d+(?:\.\d+)?)\s*([kKmM])(?![a-zA-Z])/;

/** Parse a window from a Cursor display name, e.g. "GPT-5.5 1M High" or "500k". */
export function parseContextWindow(label: string | undefined): number | undefined {
  if (!label) return undefined;
  const match = WINDOW_LABEL.exec(label);
  if (!match) return undefined;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return undefined;

  return Math.round(value * (match[2].toLowerCase() === "m" ? 1_000_000 : 1_000));
}

/**
 * Conservative family fallback when neither the IDE catalog nor the display
 * name states a window. Values are the models' standard (non-max-mode) limits.
 */
export function fallbackCursorContext(modelId: string): number {
  if (modelId.startsWith("gpt-5.5") || modelId.startsWith("gpt-5.6")) return 272_000;
  if (modelId.startsWith("gpt-5.4")) return 272_000;
  if (modelId.startsWith("gpt-5")) return 400_000;

  if (modelId.startsWith("gemini-")) return 1_000_000;
  if (modelId.startsWith("grok-")) return 256_000;
  if (modelId.startsWith("composer-")) return 200_000;
  if (modelId.startsWith("kimi-k3")) return 1_048_576;
  if (modelId.startsWith("glm-")) return 1_000_000;
  if (modelId.startsWith("muse-")) return 300_000;

  if (modelId.startsWith("claude-")) {
    if (/^claude-(?:opus|sonnet|haiku)-5(?:-|$)/.test(modelId)) return 300_000;
    if (modelId.startsWith("claude-fable")) return 300_000;
    if (modelId.startsWith("claude-opus-4-8")) return 300_000;
    return 200_000;
  }

  return DEFAULT_CURSOR_CONTEXT;
}

/** Window to advertise for a model, preferring the CLI's own label. */
export function getCursorModelContext(modelId: string, displayName?: string): number {
  return parseContextWindow(displayName) ?? fallbackCursorContext(modelId);
}
