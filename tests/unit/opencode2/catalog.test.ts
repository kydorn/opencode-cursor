import { describe, expect, it } from "bun:test";
import { discoveredModelToInfo, modelsToInventory } from "../../../src/opencode2/catalog.js";

describe("opencode2/catalog", () => {
  it("folds reasoning levels into variants that map to concrete Cursor ids", () => {
    const inventory = modelsToInventory([
      { id: "gpt-5.5-none", name: "GPT-5.5 1M None", context: 1_000_000 },
      { id: "gpt-5.5-medium", name: "GPT-5.5 1M", context: 1_000_000 },
      { id: "gpt-5.5-high", name: "GPT-5.5 1M High", context: 1_000_000 },
      { id: "auto", name: "Auto" },
    ]);

    expect(inventory.map((model) => model.id)).toEqual(["gpt-5.5", "auto"]);

    const grouped = inventory[0];
    expect(grouped).toMatchObject({
      id: "gpt-5.5",
      modelID: "gpt-5.5-medium",
      name: "GPT-5.5 1M",
      body: { cursorModel: "gpt-5.5-medium" },
      limit: { context: 1_000_000, output: 8192 },
    });
    expect(grouped.variants.map((variant) => variant.id)).toEqual(["none", "medium", "high"]);
    expect(grouped.variants.find((variant) => variant.id === "high")?.body).toEqual({
      cursorModel: "gpt-5.5-high",
    });
  });

  it("keeps direct models and applies a known context window", () => {
    const info = discoveredModelToInfo({ id: "gemini-3-flash", name: "Gemini 3 Flash" });

    expect(info.id).toBe("gemini-3-flash");
    expect(info.modelID).toBe("gemini-3-flash");
    expect(info.variants).toEqual([]);
    expect(info.limit.context).toBe(1_000_000);
    expect(info.capabilities.input).toEqual(["text", "image"]);
  });

  it("advertises image input only for models that support it", () => {
    const inventory = modelsToInventory([
      { id: "gpt-5.5-low", name: "GPT-5.5 1M Low", vision: true },
      { id: "gpt-5.5-high", name: "GPT-5.5 1M High", vision: true },
      { id: "composer-2.5", name: "Composer 2.5", vision: false },
    ]);

    expect(inventory.find((model) => model.id === "gpt-5.5")?.capabilities.input)
      .toEqual(["text", "image"]);
    expect(inventory.find((model) => model.id === "composer-2.5")?.capabilities.input)
      .toEqual(["text"]);
  });

  it("uses the Cursor default for models without a known window", () => {
    const info = discoveredModelToInfo({ id: "auto", name: "Auto" });

    expect(info.limit.context).toBe(200_000);
  });
});
