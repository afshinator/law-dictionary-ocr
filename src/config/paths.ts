// Data-directory layout, in one place (docs/09 D10). Defaults under data/ (gitignored);
// LAW_DATA_DIR overrides the root for tests and non-standard checkouts.
export interface DataPaths {
  root: string;
  scansDir: string;
  runDir: (runId: string) => string;
  eventsFile: (runId: string) => string;
  quarantineDir: (runId: string) => string;
  quarantineFile: (runId: string, page: number, side: string) => string;
}

export function dataPaths(env: NodeJS.ProcessEnv = process.env): DataPaths {
  const root = env.LAW_DATA_DIR?.trim() || "data";
  return {
    root,
    scansDir: `${root}/scans`,
    runDir: (runId) => `${root}/runs/${runId}`,
    eventsFile: (runId) => `${root}/runs/${runId}/events.jsonl`,
    quarantineDir: (runId) => `${root}/runs/${runId}/quarantine`,
    quarantineFile: (runId, page, side) => `${root}/runs/${runId}/quarantine/${page}-${side}.json`,
  };
}
