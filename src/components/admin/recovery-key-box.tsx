import { CopyLink } from "./copy-link";

/** One-time display of a recovery key with a copy button and a clear warning. */
export function RecoveryKeyBox({ keyValue }: { keyValue: string }) {
  return (
    <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4" data-recovery-key>
      <p className="text-sm font-medium text-emerald-900">Your recovery key</p>
      <CopyLink value={keyValue} label="Recovery key" />
      <p className="text-xs text-emerald-900/80">
        Save it somewhere safe now (a password manager is ideal). It is shown only once and can&rsquo;t be shown again.
        Anyone with this key can take over the admin account. Each key works once; using it creates a new one.
      </p>
    </div>
  );
}
