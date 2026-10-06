/**
 * Central media upload rules. Client-safe (no server imports) so the uploader UI
 * and the server enforce the same numbers. The server is the authority.
 */

/** Maximum size of one uploaded image. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/** Server Actions body limit: the file limit plus multipart overhead. Keep in sync with next.config.ts. */
export const SERVER_ACTION_BODY_LIMIT = "11mb";

/** Maximum number of files the uploader queues in one go (each is its own request). */
export const MAX_FILES_PER_BATCH = 10;

/** Reject absurd images even if Cloudinary would accept them. */
export const MAX_IMAGE_DIMENSION = 12000; // px, either side

/** Accepted types: MIME type -> allowed extensions. GIF/SVG/etc. are deliberately rejected. */
export const ALLOWED_IMAGE_TYPES: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

/** Cloudinary-side format allow-list (defense in depth; enforced by Cloudinary on upload). */
export const CLOUDINARY_ALLOWED_FORMATS = ["jpg", "png", "webp"] as const;

export const ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

export const ALT_MAX = 200;
export const CAPTION_MAX = 300;

export const formatBytes = (n: number | null | undefined): string => {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};
