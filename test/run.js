// Tiny test runner — no framework. Imports every *.test.js, runs each test,
// prints pass/fail with a small banner. Exits non-zero on any failure.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { tests as chords }      from "./chords.test.js";
import { tests as arp }         from "./arp.test.js";
import { tests as scheduler }   from "./scheduler.test.js";
import { tests as integration } from "./integration.test.js";
import { tests as flow }        from "./flow.test.js";
import { tests as p8mode }      from "./phase8mode.test.js";

// Syntax-check every src/*.js file with `node --check` so we catch parse
// errors in modules unit tests don't import (e.g. midi.js, app.js).
const syntaxTests = readdirSync("src").filter(f => f.endsWith(".js")).map(file => {
  return [`src/${file} parses`, () => {
    try {
      execFileSync(process.execPath, ["--check", `src/${file}`], { stdio: ["ignore", "ignore", "pipe"] });
    } catch (e) {
      throw new Error(e.stderr?.toString() || e.message);
    }
  }];
});

// Resolve-import for non-DOM modules — catches missing exports / typoed paths
// that --check ignores. app.js touches `document` at top level so we skip it.
syntaxTests.push(["src/midi.js imports cleanly", async () => {
  // navigator.requestMIDIAccess is only invoked inside init(); module-level
  // import must succeed even without a browser.
  const mod = await import("../src/midi.js");
  if (typeof mod.MidiBridge !== "function") throw new Error("MidiBridge export missing");
}]);

const suites = [
  ["syntax",      syntaxTests],
  ["chords",      chords],
  ["arp",         arp],
  ["scheduler",   scheduler],
  ["integration", integration],
  ["flow",        flow],
  ["phase8 mode", p8mode],
];

const c = (s, n) => `\x1b[${n}m${s}\x1b[0m`;
const green = s => c(s, 32), red = s => c(s, 31), grey = s => c(s, 90), bold = s => c(s, 1);

let pass = 0, fail = 0;
const failures = [];

for (const [suite, list] of suites) {
  console.log(bold(`\n${suite}`));
  for (const [name, fn] of list) {
    try {
      const r = fn();
      if (r && typeof r.then === "function") await r;
      console.log(`  ${green("✓")} ${grey(name)}`);
      pass++;
    } catch (e) {
      console.log(`  ${red("✗")} ${name}`);
      console.log(red(`    ${e.message.split("\n").join("\n    ")}`));
      fail++;
      failures.push({ suite, name, err: e });
    }
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  for (const f of failures) console.log(red(`  ${f.suite} :: ${f.name}`));
  process.exit(1);
}
