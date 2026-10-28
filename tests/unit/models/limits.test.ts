import { describe, expect, it } from "bun:test";
import { getCursorModelContext, parseContextWindow } from "../../../src/models/limits.js";

describe("models/limits", () => {
  it("reads windows from Cursor display names", () => {
    expect(parseContextWindow("GPT-5.5 1M High")).toBe(1_000_000);
    expect(parseContextWindow("Grok 4.7 500k")).toBe(500_000);
    expect(parseContextWindow("Claude Opus 5.5 1M")).toBe(1_000_000);
    expect(parseContextWindow("Composer 2.5")).toBeUndefined();
    expect(parseContextWindow("Kimi K2.5")).toBeUndefined();
  });

  it("falls back to conservative family windows", () => {
    expect(getCursorModelContext("gemini-3-flash")).toBe(1_000_000);
    expect(getCursorModelContext("composer-2.5")).toBe(200_000);
    expect(getCursorModelContext("claude-sonnet-5-5")).toBe(300_000);
    expect(getCursorModelContext("gpt-5.5-low")).toBe(272_000);
    expect(getCursorModelContext("deepseek-v41-flash-1017-low")).toBe(1_048_576);
    expect(getCursorModelContext("unknown-model")).toBe(200_000);
  });
});
