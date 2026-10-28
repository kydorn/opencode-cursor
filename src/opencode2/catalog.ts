import { CURSOR_PROVIDER_ID } from "../plugin.js";
import { supportsCursorImages } from "../models/capabilities.js";
import { getCursorModelContext } from "../models/limits.js";
import { getCursorModelCost, toOpenCode2Costs } from "../models/pricing.js";
import { groupCursorModels, type CursorModelGroup } from "../models/variants.js";
import type { DiscoveredModel } from "../models/sync.js";
import type { ConnectionInfo, ModelInfo2, ProviderEditor } from "./types.js";

/**
 * In-memory provider registration for the OpenCode 2.0 plugin — the replacement
 * for writing Cursor models into `opencode.json` (and for the next-era
 * `ctx.catalog` path that stable OpenCode 2.0 removed).
 */

/** Integration id owning Cursor credentials. Matches the provider id. */
export const CURSOR_INTEGRATION_ID = CURSOR_PROVIDER_ID;

/**
 * OpenCode 2.0 AI SDK package for the local openai-compatible proxy.
 *
 * This project does not ship a LanguageModel factory; OpenCode talks HTTP to
 * the plugin-started proxy via `@ai-sdk/openai-compatible`, same npm target the
 * OpenCode 1.x installer writes into `opencode.json`.
 */
export const CURSOR_AISDK_PACKAGE = "aisdk:@ai-sdk/openai-compatible";

const DEFAULT_OUTPUT = 8192;

function modelInfo(
  id: string,
  modelID: string,
  name: string,
  context: number,
  vision: boolean,
  costModelId: string,
): ModelInfo2 {
  return {
    id,
    modelID,
    providerID: CURSOR_PROVIDER_ID,
    name,
    capabilities: {
      tools: true,
      input: vision ? ["text", "image"] : ["text"],
      output: ["text"],
    },
    limit: {
      context,
      output: DEFAULT_OUTPUT,
    },
    variants: [],
    status: "active",
    enabled: true,
    time: { released: 0 },
    cost: toOpenCode2Costs(getCursorModelCost(costModelId)),
  };
}

function contextFor(
  model: DiscoveredModel | undefined,
  fallbackId: string,
  fallbackName: string,
): number {
  if (model) return model.context ?? getCursorModelContext(model.id, model.name);
  return getCursorModelContext(fallbackId, fallbackName);
}

function visionFor(model: DiscoveredModel | undefined, fallbackId: string): boolean {
  if (model?.vision !== undefined) return model.vision;
  return supportsCursorImages(model?.id ?? fallbackId);
}

/** Translate one discovered Cursor model into the 2.0 `Model.Info` shape. */
export function discoveredModelToInfo(model: DiscoveredModel): ModelInfo2 {
  return modelInfo(
    model.id,
    model.id,
    model.name || model.id,
    contextFor(model, model.id, model.name),
    visionFor(model, model.id),
    model.id,
  );
}

/**
 * Reasoning levels live in one model with variants. `modelID` and the base
 * body point at the default level, so a request without a variant still runs;
 * the selected variant's body switches the proxy to its concrete Cursor id.
 */
function groupedModelToInfo(
  group: CursorModelGroup,
  byId: ReadonlyMap<string, DiscoveredModel>,
): ModelInfo2 {
  const defaultModel = byId.get(group.defaultCursorModelId);
  const info = modelInfo(
    group.baseId,
    group.defaultCursorModelId,
    group.name,
    contextFor(defaultModel, group.defaultCursorModelId, group.name),
    visionFor(defaultModel, group.defaultCursorModelId),
    group.defaultCursorModelId,
  );

  return {
    ...info,
    body: { cursorModel: group.defaultCursorModelId },
    variants: Object.entries(group.variants).map(([id, cursorModel]) => ({
      id,
      body: { cursorModel },
    })),
  };
}

export function modelsToInventory(models: readonly DiscoveredModel[]): ModelInfo2[] {
  const { groups, direct } = groupCursorModels([...models]);
  const byId = new Map(models.map((model) => [model.id, model]));

  return [
    ...groups.map((group) => groupedModelToInfo(group, byId)),
    ...direct.map(discoveredModelToInfo),
  ];
}

/**
 * Publish discovered Cursor models into the live provider inventory.
 *
 * Skip while empty (keeps the last successful inventory through a no-op
 * transform on first register). `baseURL` is the live local proxy — OpenCode
 * routes openai-compatible traffic there via provider settings.
 */
export function applyCursorProviderInventory(
  editor: ProviderEditor,
  models: readonly DiscoveredModel[],
  baseURL: string,
  sourceConnection?: ConnectionInfo,
): void {
  if (models.length === 0 || !baseURL) return;

  editor.add({
    info: {
      id: CURSOR_PROVIDER_ID,
      name: "Cursor",
      activation: "enabled",
      package: CURSOR_AISDK_PACKAGE,
      integrationID: CURSOR_INTEGRATION_ID,
      settings: {
        baseURL,
        // Placeholder only — the proxy resolves the real key from env /
        // the Authorization header set on each Cursor model request.
        apiKey: "cursor-agent",
      },
    },
    models: modelsToInventory(models),
    ...(sourceConnection ? { sourceConnection } : {}),
  });
}
