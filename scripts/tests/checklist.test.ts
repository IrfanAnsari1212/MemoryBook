/** Unit tests for the production checklist. Run: npm run test:unit */
import assert from "node:assert/strict";
import { buildChecklist, type ChecklistInput } from "../../src/lib/books/checklist";

const base: ChecklistInput = {
  details: { title: "T", recipientName: "R", senderName: "S", occasion: "O", slug: "s", coverTitle: "C", hasDate: true },
  status: "DRAFT",
  pages: { total: 0, published: 0 },
  photoPagesWithoutImage: 0,
  themeName: "Soft Blush",
  music: { configured: false, enabled: false },
  activeShareLinks: 0,
};
const by = (i: ChecklistInput) => Object.fromEntries(buildChecklist(i).map((c) => [c.key, c]));
let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log("ok -", name); };

t("empty draft book", () => {
  const c = by(base);
  assert.equal(c.details.done, true);
  assert.equal(c.pages.done, false);
  assert.equal(c["published-pages"].done, false);
  assert.equal(c.published.done, false);
  assert.equal(c.share.done, false);
  assert.equal(c.theme.done, true);
});
t("music is optional and never required", () => {
  const c = by(base);
  assert.equal(c.music.optional, true);
  assert.match(c.music.note, /fine/);
  assert.equal(by({ ...base, music: { configured: true, enabled: false } }).music.done, false);
  assert.equal(by({ ...base, music: { configured: true, enabled: true } }).music.done, true);
});
t("only the music item is optional", () => {
  assert.deepEqual(buildChecklist(base).filter((c) => c.optional).map((c) => c.key), ["music"]);
});
t("drafts keep 'all published' unfinished and are counted", () => {
  const c = by({ ...base, pages: { total: 3, published: 1 } });
  assert.equal(c["published-pages"].done, false);
  assert.match(c["published-pages"].note, /2 pages still drafts/);
  assert.equal(by({ ...base, pages: { total: 3, published: 3 } })["published-pages"].done, true);
});
t("photo pages without images are flagged", () => {
  assert.equal(by({ ...base, photoPagesWithoutImage: 2 }).media.done, false);
  assert.equal(by(base).media.done, true);
});
t("missing details are detected", () => {
  assert.equal(by({ ...base, details: { ...base.details, hasDate: false } }).details.done, false);
  assert.equal(by({ ...base, details: { ...base.details, recipientName: "  " } }).details.done, false);
});
t("published + share link complete the list", () => {
  const c = by({ ...base, status: "PUBLISHED", pages: { total: 1, published: 1 }, activeShareLinks: 2 });
  assert.equal(c.published.done, true);
  assert.equal(c.share.done, true);
  assert.match(c.share.note, /2 active links/);
});
t("archived book explains how to restore", () => {
  assert.match(by({ ...base, status: "ARCHIVED" }).published.note, /Restore/);
});
console.log(`${n} passed`);
