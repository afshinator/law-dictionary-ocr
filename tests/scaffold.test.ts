// Scaffold smoke test: proves the TS sources load through the test runner and export.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SCAFFOLD_READY } from "../src/index.ts";

describe("scaffold", () => {
  it("loads the source module and reads an export", () => {
    assert.equal(SCAFFOLD_READY, true);
  });
});
