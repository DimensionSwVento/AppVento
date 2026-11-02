// StrykerJS configuration for the RQ2 mutation-testing run on the frontend
// geospatial utilities. Copied to Vento/ in a disposable worktree at run time
// (see workspace/evidence/mutation/DESIGN.md in the paper workspace).
//
// The vitest runner always uses perTest coverage analysis and `related: true`,
// so each mutant only runs the test files related to the mutated module.
export default {
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.config.ts",
    related: true,
  },
  mutate: [
    "src/app/Utils/h3/h3Resolution.ts",
    "src/app/Utils/h3/h3TileIndex.ts",
    "src/app/Utils/h3/hexClassification.ts",
    "src/app/Utils/h3/geocoder.ts",
    "src/app/Utils/h3/mapGeo.ts",
    "src/app/Utils/h3/parseH3Parquet.ts",
    "src/app/Utils/report/areaCalc.ts",
    "src/app/Utils/report/colombiaRegions.ts",
  ],
  reporters: ["clear-text", "progress", "json"],
  jsonReporter: { fileName: "quality/evidence/mutation/stryker.json" },
  thresholds: { high: 80, low: 60, break: null },
  timeoutMS: 60000,
  concurrency: 4,
  tempDirName: ".stryker-tmp",
  cleanTempDir: true,
};
