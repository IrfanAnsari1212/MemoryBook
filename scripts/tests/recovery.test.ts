/** Unit tests for account recovery (fake dependencies). Run: npm run test:unit */
import assert from "node:assert/strict";
import { generateRecoveryKey, hashRecoveryKey, isWellFormedRecoveryKey, recoverAccount, type RecoverDeps } from "../../src/lib/auth/recovery";

const goodKey = generateRecoveryKey();
function fake(over: Partial<RecoverDeps> = {}) {
  const updates: Array<{ id: string; email: string; passwordHash: string; recoveryKeyHash: string }> = [];
  const deps: RecoverDeps = {
    hashPassword: async (p) => "hash(" + p.length + ")",
    findAdminByKeyHash: async (h) => (h === hashRecoveryKey(goodKey) ? { id: "u1" } : null),
    updateAccount: async (id, d) => { updates.push({ id, ...d }); return "ok"; },
    ...over,
  };
  return { deps, updates };
}
const valid = { recoveryKey: goodKey, email: "New@Example.com", password: "a-long-password-1", confirm: "a-long-password-1" };
let n = 0;
const t = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log("ok -", name); };

(async () => {
  await t("keys are 43 URL-safe chars, unique, and hashed deterministically", async () => {
    const keys = new Set(Array.from({ length: 200 }, generateRecoveryKey));
    assert.equal(keys.size, 200);
    for (const k of keys) assert.ok(isWellFormedRecoveryKey(k));
    assert.equal(hashRecoveryKey("a"), hashRecoveryKey("a"));
    assert.notEqual(hashRecoveryKey(goodKey), goodKey);
  });
  await t("valid key sets email (normalised) + password, rotates the key, returns the new key once", async () => {
    const f = fake();
    const r = await recoverAccount(valid, f.deps);
    assert.equal(r.ok, true);
    const u = f.updates[0];
    assert.equal(u.id, "u1");
    assert.equal(u.email, "new@example.com");
    assert.ok(u.passwordHash.startsWith("hash("));
    const newKey = (r as { newKey: string }).newKey;
    assert.ok(isWellFormedRecoveryKey(newKey) && newKey !== goodKey);
    assert.equal(u.recoveryKeyHash, hashRecoveryKey(newKey));
    assert.notEqual(u.recoveryKeyHash, hashRecoveryKey(goodKey), "old key no longer matches");
  });
  await t("wrong, malformed or empty keys are rejected with one generic message and change nothing", async () => {
    for (const recoveryKey of ["", "short", generateRecoveryKey(), goodKey.slice(0, -1) + (goodKey.endsWith("A") ? "B" : "A"), goodKey + "x", "../../etc/passwd"]) {
      const f = fake();
      const r = await recoverAccount({ ...valid, recoveryKey }, f.deps);
      assert.equal(r.ok, false, recoveryKey);
      assert.equal((r as { error: string }).error, "That recovery key isn't valid.");
      assert.equal(f.updates.length, 0);
    }
  });
  await t("weak / mismatched password and bad email are rejected before any lookup", async () => {
    for (const patch of [{ password: "short", confirm: "short" }, { confirm: "different-password-1" }, { email: "not-an-email" }, { email: "" }]) {
      let looked = false;
      const f = fake({ findAdminByKeyHash: async () => { looked = true; return null; } });
      const r = await recoverAccount({ ...valid, ...patch }, f.deps);
      assert.equal(r.ok, false);
      assert.equal(looked, false);
    }
  });
  await t("a taken email is reported without changing anything else", async () => {
    const f = fake({ updateAccount: async () => "email_taken" });
    const r = await recoverAccount(valid, f.deps);
    assert.equal(r.ok, false);
  });
  await t("non-string inputs cannot crash or bypass validation", async () => {
    for (const bad of [null, undefined, 5, {}, ["x"]]) {
      const f = fake();
      const r = await recoverAccount({ ...valid, recoveryKey: bad as never }, f.deps);
      assert.equal(r.ok, false);
      assert.equal(f.updates.length, 0);
    }
  });
  console.log(`${n} passed`);
})();
