// Run: pnpm exec tsx packages/api/src/games.check.ts
import assert from "node:assert/strict";
import { hasBacklink, slugify, verifyBadge } from "./games";
const host = "igame9.ai";
assert.ok(hasBacklink(`<a href="https://igame9.ai/" target="_blank"><img src="x"></a>`, host));
assert.ok(hasBacklink(`<A HREF='https://www.igame9.ai/games/x'>x</A>`, host));
assert.ok(!hasBacklink(`<a href="https://igame9.ai/" rel="nofollow">x</a>`, host));
assert.ok(!hasBacklink(`<a href="https://igame9.ai.evil.com/">x</a>`, host));
assert.ok(!hasBacklink(`<img src="https://igame9.ai/badge.svg">`, host));
assert.equal(slugify("Sky Runner 2: Ünïcode!"), "sky-runner-2-unicode");
assert.equal(slugify("!!!"), "game");
// SSRF guard: private and loopback targets are refused before any request is made.
assert.equal(await verifyBadge("http://127.0.0.1:3011/"), false);
assert.equal(await verifyBadge("http://localhost/"), false);
assert.equal(await verifyBadge("http://[::1]/"), false);
assert.equal(await verifyBadge("http://169.254.169.254/latest/meta-data/"), false);
console.log("games checks passed");
process.exit(0);
