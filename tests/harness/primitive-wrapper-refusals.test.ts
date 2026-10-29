import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const execFileAsync = promisify(execFile);

// JSON, util.inspect, structuredClone and deep equality cannot read a
// wrapper's [[PrimitiveValue]] slot yet, so a wrapper anywhere in their
// argument refuses with a catchable error instead of a silently wrong
// answer. Values without a wrapper keep working in the same program.
test("graph-walking consumers refuse primitive wrapper objects", async () => {
  const outDir = mkdtempSync(join(tmpdir(), "scriptc-wrapper-refusals-"));
  const entry = join(outDir, "main.mjs");
  writeFileSync(
    entry,
    `
function attempt(label, run) {
  try { run(); process.stdout.write(label + " ok\\n"); } catch (error) { process.stdout.write(label + " " + error.message + "\\n"); }
}
attempt("json", () => JSON.stringify({ v: new Number(3) }));
attempt("log", () => console.log([new String("a")]));
attempt("clone", () => structuredClone([new Boolean(true)]));
attempt("plain json", () => JSON.stringify({ v: 3 }));
attempt("plain clone", () => structuredClone([true]));
`,
  );
  const result = await compile(entry, {
    backend: "llvm",
    sanitize: process.env["SCRIPTC_SAN"] === "1",
    outDir,
    outPath: join(outDir, "program"),
  });
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) return;
  const { stdout } = await execFileAsync(result.binaryPath, [], { encoding: "utf8" });
  const refused = (consumer: string): string =>
    `${consumer} of a primitive wrapper object (new String/Number/Boolean or Object(primitive)) is not supported yet`;
  expect(stdout).toBe(
    [
      `json ${refused("JSON.stringify")}`,
      `log ${refused("console.log/util.inspect")}`,
      `clone ${refused("structuredClone")}`,
      "plain json ok",
      "plain clone ok",
      "",
    ].join("\n"),
  );
});
