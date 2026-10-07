import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { requireEnv } from "@/lib/env";
import { generateToken } from "@/lib/utils";
import { CLOUDINARY_ALLOWED_FORMATS } from "@/lib/media/config";
import { bookFolder, type StorageAdapter, type UploadedAsset } from "@/lib/media/service";
import { CLOUDINARY_AUDIO_FORMATS } from "@/lib/music/config";
import { musicFolder, type AudioStorage, type UploadedAudio } from "@/lib/music/service";

let configured = false;

/** Configure the SDK from server-only env vars on first use. The secret never leaves this module. */
function sdk() {
  if (!configured) {
    cloudinary.config({
      cloud_name: requireEnv("CLOUDINARY_CLOUD_NAME"),
      api_key: requireEnv("CLOUDINARY_API_KEY"),
      api_secret: requireEnv("CLOUDINARY_API_SECRET"),
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export const cloudinaryStorage: StorageAdapter = {
  upload(bytes, { bookId }) {
    // The public id is generated here (never taken from the client) and nested in the book's folder.
    const publicId = `${bookFolder(bookId)}/${generateToken(16)}`;
    return new Promise<UploadedAsset>((resolve, reject) => {
      const stream = sdk().uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: "image",
          overwrite: false,
          allowed_formats: [...CLOUDINARY_ALLOWED_FORMATS],
        },
        (error, result) => {
          if (error || !result) {
            // Log a short, secret-free message; never the whole SDK error object.
            console.error("cloudinary upload failed:", error?.http_code ?? "no-result");
            return reject(new Error("upload failed"));
          }
          resolve({
            publicId: result.public_id,
            url: result.secure_url,
            width: result.width ?? null,
            height: result.height ?? null,
            bytes: result.bytes ?? null,
            format: result.format ?? null,
          });
        },
      );
      stream.end(bytes);
    });
  },

  async destroy(publicId) {
    const res = await sdk().uploader.destroy(publicId, { resource_type: "image", invalidate: true });
    if (res.result === "ok" || res.result === "not found") return true;
    throw new Error("destroy failed");
  },
};

/**
 * Audio is stored as a Cloudinary "video" resource (Cloudinary's type for audio files), inside the
 * book's own music folder. The public id is generated here, never taken from the client.
 */
export const cloudinaryAudioStorage: AudioStorage = {
  upload(bytes, { bookId }) {
    const publicId = `${musicFolder(bookId)}/${generateToken(16)}`;
    return new Promise<UploadedAudio>((resolve, reject) => {
      const stream = sdk().uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: "video",
          overwrite: false,
          allowed_formats: [...CLOUDINARY_AUDIO_FORMATS],
        },
        (error, result) => {
          if (error || !result) {
            console.error("cloudinary audio upload failed:", error?.http_code ?? "no-result");
            return reject(new Error("upload failed"));
          }
          resolve({
            publicId: result.public_id,
            url: result.secure_url,
            bytes: result.bytes ?? null,
            format: result.format ?? null,
            durationSeconds: typeof result.duration === "number" ? Math.round(result.duration) : null,
          });
        },
      );
      stream.end(bytes);
    });
  },

  async destroy(publicId) {
    const res = await sdk().uploader.destroy(publicId, { resource_type: "video", invalidate: true });
    if (res.result === "ok" || res.result === "not found") return true;
    throw new Error("destroy failed");
  },
};

/**
 * Bulk cleanup used by permanent book deletion. Callers pass ids/prefixes already scoped to one book
 * (see lib/books/delete.ts). A missing asset counts as success so a retry after a partial failure is safe.
 */
export const cloudinaryBookCleanup = {
  async deleteAssets(resourceType: "image" | "video", publicIds: string[]) {
    for (let i = 0; i < publicIds.length; i += 100) {
      const res = await sdk().api.delete_resources(publicIds.slice(i, i + 100), { resource_type: resourceType, type: "upload", invalidate: true });
      for (const v of Object.values(res.deleted ?? {})) if (v !== "deleted" && v !== "not_found") throw new Error("delete failed");
    }
  },
  /** `prefix` must end with a slash so it can never match a sibling folder (for example another book's id). */
  async sweepFolder(prefix: string) {
    if (!prefix.startsWith("memoryletter/books/") || !prefix.endsWith("/")) throw new Error("refusing unscoped prefix");
    for (const resourceType of ["image", "video"] as const) {
      let done = false;
      for (let i = 0; i < 20 && !done; i++) {
        const r = await sdk().api.delete_resources_by_prefix(prefix, { resource_type: resourceType, type: "upload", invalidate: true });
        done = !r.partial;
      }
      if (!done) throw new Error("sweep incomplete");
    }
    // Empty folders are cosmetic: best effort, never an error.
    for (const f of [`${prefix}music`, prefix.slice(0, -1)]) {
      try { await sdk().api.delete_folder(f); } catch { /* ignore */ }
    }
  },
};
