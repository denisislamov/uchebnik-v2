import { test } from "node:test";
import assert from "node:assert/strict";
import { adminRoute } from "../src/admin/route.ts";
test("only exact administrative paths select the private interface", () => {
  for (const [path, want] of [
    ["/admin", "login"],
    ["/admin/", "login"],
    ["/admin/reset", "reset"],
    ["/admin/reset/", "reset"],
    ["/administrator", null],
    ["/", null],
    ["/admin-guide", null],
  ] as const)
    assert.equal(adminRoute(path), want, path);
});
