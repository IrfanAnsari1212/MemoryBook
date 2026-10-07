/**
 * Playback URLs are never accepted from the client. The only URLs ever stored are the ones Cloudinary
 * returns for a server-side upload, and the only ones ever played are those that still pass this
 * allowlist when read back: https, Cloudinary's delivery host, THIS account's audio path, no
 * credentials or custom port, and a supported audio extension. Client-safe (pure).
 */
const EXT = /\.(mp3|m4a|wav)$/i;

export function isAllowedAudioUrl(url: string | null | undefined, cloudName: string | null | undefined): url is string {
  if (!url || !cloudName) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname === "res.cloudinary.com" &&
      u.port === "" &&
      u.username === "" &&
      u.password === "" &&
      u.pathname.startsWith(`/${cloudName}/video/upload/`) &&
      EXT.test(u.pathname)
    );
  } catch {
    return false;
  }
}

export function audioMimeFromUrl(url: string): string | undefined {
  const ext = new URL(url).pathname.match(EXT)?.[1]?.toLowerCase();
  return ext === "mp3" ? "audio/mpeg" : ext === "m4a" ? "audio/mp4" : ext === "wav" ? "audio/wav" : undefined;
}
