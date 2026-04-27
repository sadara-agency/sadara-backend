#!/usr/bin/env ts-node
// Static linter for migration files — catches the 3 patterns that caused CI failures.
// Run via: npm run migrate:lint
// Exits non-zero if any violation is found.

import * as fs from "fs";
import * as path from "path";

const MIGRATIONS_DIR = path.join(
  __dirname,
  "../src/database/migrations",
);

// Migrations predating this linter are excluded (they pass smoke on existing data;
// a separate backfill ticket covers them).
const CUTOVER_MIGRATION = 172;

interface Violation {
  file: string;
  line: number;
  rule: string;
  text: string;
}

function migrationNumber(filename: string): number {
  const m = filename.match(/^(\d+)_/);
  return m ? parseInt(m[1], 10) : 0;
}

function lintFile(filePath: string, filename: string): Violation[] {
  if (migrationNumber(filename) < CUTOVER_MIGRATION) return [];

  const src = fs.readFileSync(filePath, "utf8");
  const lines = src.split("\n");
  const violations: Violation[] = [];

  lines.forEach((line, i) => {
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Allow per-line disable comment
    if (trimmed.endsWith("// migration-lint: disable-next-line")) return;
    const prevLine = i > 0 ? lines[i - 1].trim() : "";
    if (prevLine === "// migration-lint: disable-next-line") return;

    // Rule 1: destructure without QueryTypes.SELECT
    // Pattern: const [x] = await ... .query(
    if (
      /const\s+\[/.test(line) &&
      /await\s+\S+\.query\s*\(/.test(line) &&
      !line.includes("QueryTypes.SELECT")
    ) {
      violations.push({
        file: filename,
        line: lineNum,
        rule: "no-destructure-without-select-type",
        text: trimmed,
      });
    }

    // Also catch multi-line: const [x] = await on one line, .query( on subsequent line
    // — check if we have `const [` followed by `await` but no QueryTypes anywhere in surrounding block
    if (
      /^\s*const\s+\[/.test(line) &&
      line.includes("await") &&
      !line.includes("QueryTypes.SELECT")
    ) {
      // Look ahead up to 5 lines for .query( and ensure QueryTypes is present
      let blockEnd = Math.min(i + 5, lines.length);
      let blockSrc = lines.slice(i, blockEnd).join(" ");
      if (
        blockSrc.includes(".query(") &&
        !blockSrc.includes("QueryTypes.SELECT")
      ) {
        // Only flag if not already flagged above
        if (!violations.some((v) => v.line === lineNum)) {
          violations.push({
            file: filename,
            line: lineNum,
            rule: "no-destructure-without-select-type",
            text: trimmed,
          });
        }
      }
    }

    // Rule 2: wrong umzug v3 signature — up/down receiving QueryInterface directly
    if (
      /export\s+async\s+function\s+(up|down)\s*\(\s*queryInterface\s*:\s*QueryInterface/.test(
        line,
      )
    ) {
      violations.push({
        file: filename,
        line: lineNum,
        rule: "no-direct-queryinterface-param",
        text: trimmed,
      });
    }

    // Rule 3: addColumn / addIndex / removeColumn without guard
    // Check if the function body contains a guard (tableExists/columnExists/addColumnIfMissing)
    // We do a file-level check: if addColumn/addIndex/removeColumn appears but no guard word does
    if (
      /queryInterface\.(addColumn|addIndex|removeColumn|changeColumn)\s*\(/.test(
        line,
      )
    ) {
      const hasGuard =
        src.includes("tableExists") ||
        src.includes("columnExists") ||
        src.includes("indexExists") ||
        src.includes("addColumnIfMissing") ||
        src.includes("removeColumnIfPresent") ||
        src.includes("information_schema") ||
        src.includes("pg_indexes");

      if (!hasGuard) {
        violations.push({
          file: filename,
          line: lineNum,
          rule: "no-unguarded-schema-change",
          text: trimmed,
        });
      }
    }
  });

  return violations;
}

function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".ts"))
    .sort();

  const allViolations: Violation[] = [];

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const violations = lintFile(filePath, file);
    allViolations.push(...violations);
  }

  if (allViolations.length === 0) {
    console.log(
      `✓ Migration lint passed (${files.length} files, cutover >= ${CUTOVER_MIGRATION})`,
    );
    process.exit(0);
  }

  console.error(
    `\n✗ Migration lint failed — ${allViolations.length} violation(s):\n`,
  );

  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}]`);
    console.error(`    ${v.text}`);
  }

  console.error(`
Rules:
  no-destructure-without-select-type  — Use { type: QueryTypes.SELECT }; never destructure without it
  no-direct-queryinterface-param      — umzug v3: use ({ context: queryInterface }) not (queryInterface: QueryInterface)
  no-unguarded-schema-change          — addColumn/addIndex/removeColumn must be guarded by tableExists/columnExists

To suppress a specific line: add a comment on the line before:
  // migration-lint: disable-next-line
`);

  process.exit(1);
}

main();
