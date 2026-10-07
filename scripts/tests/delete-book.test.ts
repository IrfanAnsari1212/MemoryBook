/** Unit tests for permanent book deletion (fake dependencies). Run: npm run test:unit */
import assert from "node:assert/strict";
import { deleteBookPermanently, type BookAsset, type DeleteBookDeps } from "../../src/lib/books/delete";

type Call = string;
function fake(over: Partial<DeleteBookDeps> & { owner?: string; assets?: BookAsset[]; title?: string } = {}) {
  const calls: Call[] = [];
  const deleted: { image: string[]; video: string[] } = { image: [], video: [] };
  const swept: string[] = [];
  const deps: DeleteBookDeps = {
    findOwnedBook: async (ownerId, bookId) => {
      calls.push("find");
      return ownerId === (over.owner ?? "owner1") && bookId === "book1" ? { id: "book1", title: over.title ?? "My Book", status: "PUBLISHED" } : null;
    },
    listAssets: async () => over.assets ?? [
      { publicId: "memoryletter/books/book1/aaa", type: "IMAGE" },
      { publicId: "memoryletter/books/book1/music/bbb", type: "AUDIO" },
    ],
    takeOffline: async () => { calls.push("offline"); },
    deleteAssets: async (rt, ids) => { calls.push("assets:" + rt); deleted[rt].push(...ids); },
    sweepFolder: async (p) => { calls.push("sweep"); swept.push(p); },
    deleteBookRecord: async () => { calls.push("db"); return 1; },
    log: () => {},
    ...over,
  };
  return { deps, calls, deleted, swept };
}
let n = 0;
const t = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log("ok -", name); };
const ok = { bookId: "book1", confirmTitle: "My Book" };

(async () => {
  await t("owner deletes with the exact name: offline, assets, sweep, then the DB row (in that order)", async () => {
    const f = fake();
    const r = await deleteBookPermanently("owner1", ok, f.deps);
    assert.deepEqual(r, { ok: true, removedAssets: 2 });
    assert.deepEqual(f.calls, ["find", "offline", "assets:image", "assets:video", "sweep", "db"]);
  });
  await t("cleanup is scoped to this book's folder (trailing slash) and its own ids", async () => {
    const f = fake();
    await deleteBookPermanently("owner1", ok, f.deps);
    assert.deepEqual(f.swept, ["memoryletter/books/book1/"]);
    assert.deepEqual(f.deleted.image, ["memoryletter/books/book1/aaa"]);
    assert.deepEqual(f.deleted.video, ["memoryletter/books/book1/music/bbb"]);
  });
  await t("assets outside the book folder are never deleted (other book, traversal, prefix lookalike)", async () => {
    const f = fake({ assets: [
      { publicId: "memoryletter/books/book2/x", type: "IMAGE" },
      { publicId: "memoryletter/books/book10/x", type: "IMAGE" },
      { publicId: "memoryletter/books/book1/../book2/x", type: "IMAGE" },
      { publicId: "other/x", type: "AUDIO" },
      { publicId: "memoryletter/books/book1/mine", type: "IMAGE" },
    ] });
    const r = await deleteBookPermanently("owner1", ok, f.deps);
    assert.equal(r.ok, true);
    assert.deepEqual(f.deleted.image, ["memoryletter/books/book1/mine"]);
    assert.deepEqual(f.deleted.video, []);
  });
  await t("no assets: no Cloudinary delete calls, still sweeps and deletes", async () => {
    const f = fake({ assets: [] });
    assert.deepEqual(await deleteBookPermanently("owner1", ok, f.deps), { ok: true, removedAssets: 0 });
    assert.deepEqual(f.calls, ["find", "offline", "sweep", "db"]);
  });
  await t("wrong owner is indistinguishable from a missing book and touches nothing", async () => {
    const f = fake();
    const r = await deleteBookPermanently("someone-else", ok, f.deps);
    assert.deepEqual(r, { ok: false, code: "not_found", error: "Memory book not found." });
    assert.deepEqual(f.calls, ["find"]);
    const g = fake();
    assert.equal((await deleteBookPermanently("owner1", { bookId: "nope", confirmTitle: "My Book" }, g.deps)).ok, false);
    assert.deepEqual(g.calls, ["find"]);
  });
  await t("wrong / empty / differently-cased / padded confirmation is rejected and nothing is changed", async () => {
    for (const confirmTitle of ["my book", "My Book ", " My Book", "My Boo", "Other", ""]) {
      const f = fake();
      const r = await deleteBookPermanently("owner1", { bookId: "book1", confirmTitle }, f.deps);
      assert.equal(r.ok, false, JSON.stringify(confirmTitle));
      assert.equal((r as { code: string }).code, "confirmation");
      assert.ok(!f.calls.includes("offline") && !f.calls.includes("db") && f.deleted.image.length === 0);
    }
  });
  await t("malformed / manipulated input is rejected before any lookup", async () => {
    for (const input of [
      { bookId: null, confirmTitle: "x" }, { bookId: 5, confirmTitle: "x" }, { bookId: "", confirmTitle: "x" },
      { bookId: "a".repeat(65), confirmTitle: "x" }, { bookId: ["book1"], confirmTitle: "My Book" },
      { bookId: "book1", confirmTitle: null }, { bookId: "book1", confirmTitle: { a: 1 } }, { bookId: "book1", confirmTitle: "x".repeat(201) },
    ]) {
      const f = fake();
      const r = await deleteBookPermanently("owner1", input as never, f.deps);
      assert.equal(r.ok, false);
      assert.deepEqual(f.calls, []);
    }
  });
  await t("a client-supplied ownerId is ignored (ownership comes from the caller only)", async () => {
    const f = fake();
    const r = await deleteBookPermanently("attacker", { bookId: "book1", confirmTitle: "My Book", ownerId: "owner1" } as never, f.deps);
    assert.equal(r.ok, false);
    assert.deepEqual(f.calls, ["find"]);
  });
  await t("Cloudinary failure: DB row is NOT deleted, the book is offline, the user is told, and retry succeeds", async () => {
    let fail = true;
    const f = fake({ deleteAssets: async () => { if (fail) throw new Error("boom: secret-ish detail"); } });
    const r1 = await deleteBookPermanently("owner1", ok, f.deps);
    assert.equal(r1.ok, false);
    assert.equal((r1 as { code: string }).code, "cleanup_failed");
    assert.ok(!(r1 as { error: string }).error.includes("boom"), "no internal detail leaked");
    assert.ok(f.calls.includes("offline") && !f.calls.includes("db"));
    fail = false;
    assert.equal((await deleteBookPermanently("owner1", ok, f.deps)).ok, true);
    assert.ok(f.calls.includes("db"));
  });
  await t("sweep failure also blocks the DB delete", async () => {
    const f = fake({ sweepFolder: async () => { throw new Error("x"); } });
    const r = await deleteBookPermanently("owner1", ok, f.deps);
    assert.equal((r as { code: string }).code, "cleanup_failed");
    assert.ok(!f.calls.includes("db"));
  });
  await t("DB failure after cleanup is reported (not silent) and leaks no detail", async () => {
    const f = fake({ deleteBookRecord: async () => { throw new Error("connection string xyz"); } });
    const r = await deleteBookPermanently("owner1", ok, f.deps);
    assert.equal((r as { code: string }).code, "db_failed");
    assert.ok(!(r as { error: string }).error.includes("xyz"));
  });
  await t("a concurrent delete (0 rows) is reported as not found", async () => {
    const f = fake({ deleteBookRecord: async () => 0 });
    assert.equal((await deleteBookPermanently("owner1", ok, f.deps) as { code: string }).code, "not_found");
  });
  console.log(`${n} passed`);
})();
