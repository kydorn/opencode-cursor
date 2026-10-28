import { describe, expect, it } from "bun:test";
import { supportsCursorImages } from "../../../src/models/capabilities.js";

describe("models/capabilities", () => {
  it("falls back to image support for known vision families", () => {
    expect(supportsCursorImages("auto")).toBe(true);
    expect(supportsCursorImages("gpt-5.5-low")).toBe(true);
    expect(supportsCursorImages("claude-sonnet-5-5-medium")).toBe(true);
    expect(supportsCursorImages("gemini-3-flash")).toBe(true);
    expect(supportsCursorImages("deepseek-v41-flash-1017-low")).toBe(true);
    expect(supportsCursorImages("cursor-grok-4.6-low")).toBe(true);
  });

  it("rejects families without image input and unknown models", () => {
    expect(supportsCursorImages("composer-2.5")).toBe(false);
    expect(supportsCursorImages("grok-4.7-low")).toBe(false);
    expect(supportsCursorImages("unknown-model")).toBe(false);
  });
});
