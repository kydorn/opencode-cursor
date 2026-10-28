import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import {
  cleanupCliImages,
  materializeImagesForCli,
} from "../../../src/proxy/cli-images.js";

const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

describe("proxy/cli-images", () => {
  it("writes data images to temporary files and cleans them up", async () => {
    const images = await materializeImagesForCli([
      { data: ONE_PIXEL_PNG, mimeType: "image/png" },
    ]);

    expect(images?.paths).toHaveLength(1);
    expect(images?.paths[0].endsWith(".png")).toBe(true);
    expect(readFileSync(images!.paths[0]).subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );

    cleanupCliImages(images!.dir);
    expect(existsSync(images!.dir)).toBe(false);
  });

  it("uses the image subtype for uncommon formats", async () => {
    const images = await materializeImagesForCli([
      { data: Buffer.from("avif-bytes").toString("base64"), mimeType: "image/avif" },
    ]);

    expect(images?.paths[0].endsWith(".avif")).toBe(true);
    cleanupCliImages(images?.dir);
  });

  it("returns undefined when no usable image remains", async () => {
    expect(await materializeImagesForCli([])).toBeUndefined();
    expect(await materializeImagesForCli([{ url: "file:///tmp/not-http.png" }])).toBeUndefined();
  });
});
