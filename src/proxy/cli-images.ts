/**
 * Materialize chat image attachments as local files for the cursor-agent CLI.
 *
 * The CLI accepts the internal `--image <path>` flag, while the proxy receives
 * data URLs (or, less often, remote URLs) from OpenCode. The SDK backend takes
 * the original objects; only the CLI needs this translation.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SdkImageLike } from "./image-extract.js";

export type CliImages = {
  paths: string[];
  dir: string;
};

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
};

function extensionFor(mimeType: string | undefined): string {
  if (!mimeType) return "png";
  const known = MIME_EXTENSIONS[mimeType.toLowerCase()];
  if (known) return known;

  const subtype = mimeType.split("/")[1]?.replace(/[^a-z0-9]/gi, "");
  return subtype || "png";
}

async function readImage(image: SdkImageLike): Promise<{ data: Buffer; mimeType?: string } | undefined> {
  if (image.data) {
    const data = Buffer.from(image.data, "base64");
    return data.length > 0 ? { data, mimeType: image.mimeType } : undefined;
  }

  const url = image.url;
  if (!url || !/^https?:\/\//i.test(url)) return undefined;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return undefined;
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length === 0) return undefined;
    return {
      data,
      mimeType: response.headers.get("content-type")?.split(";")[0]?.trim(),
    };
  } catch {
    return undefined;
  }
}

/** Delete a materialized-image directory; safe to call more than once. */
export function cleanupCliImages(dir: string | undefined): void {
  if (!dir) return;
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

/**
 * Write images to a temporary directory and return their paths. Returns
 * undefined when no usable image remains.
 */
export async function materializeImagesForCli(
  images: readonly SdkImageLike[],
): Promise<CliImages | undefined> {
  if (images.length === 0) return undefined;

  const dir = mkdtempSync(join(tmpdir(), "open-cursor-images-"));
  const paths: string[] = [];

  try {
    for (const [index, image] of images.entries()) {
      const imageData = await readImage(image);
      if (!imageData) continue;

      const path = join(dir, `image-${index}.${extensionFor(imageData.mimeType)}`);
      writeFileSync(path, imageData.data);
      paths.push(path);
    }
  } catch (err) {
    cleanupCliImages(dir);
    throw err;
  }

  if (paths.length === 0) {
    cleanupCliImages(dir);
    return undefined;
  }

  return { paths, dir };
}
