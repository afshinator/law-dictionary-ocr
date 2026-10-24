// config/paths.ts: the single source of truth for data-directory layout (docs/09 D10).
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dataPaths } from "../../src/config/paths.ts";

describe("dataPaths", () => {
  it("defaults under data/", () => {
    const p = dataPaths({});
    assert.equal(p.scansDir, "data/scans");
    assert.equal(p.runDir("r1"), "data/runs/r1");
    assert.equal(p.eventsFile("r1"), "data/runs/r1/events.jsonl");
    assert.equal(p.quarantineDir("r1"), "data/runs/r1/quarantine");
    assert.equal(p.quarantineFile("r1", 7, "left"), "data/runs/r1/quarantine/7-left.json");
  });

  it("overrides the data root from LAW_DATA_DIR", () => {
    const p = dataPaths({ LAW_DATA_DIR: "/tmp/ldo" });
    assert.equal(p.eventsFile("r1"), "/tmp/ldo/runs/r1/events.jsonl");
    assert.equal(p.quarantineFile("r2", 9, "right"), "/tmp/ldo/runs/r2/quarantine/9-right.json");
  });

  it("ignores a whitespace-only override", () => {
    assert.equal(dataPaths({ LAW_DATA_DIR: "   " }).scansDir, "data/scans");
  });
});
