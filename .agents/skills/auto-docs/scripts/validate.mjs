#!/usr/bin/env node

/**
 * Validates auto-docs output:
 * 1. TOON syntax in .toon files and ```toon blocks in .md files
 * 2. Existence of all expected tool-specific output files
 *
 * Usage:
 *   node validate.mjs [docs-dir]        # validate TOON only (default: .ai/docs)
 *   node validate.mjs --all [project]   # validate TOON + all tool outputs
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { decode } from "@toon-format/toon";

const args = process.argv.slice(2);
const checkAll = args.includes("--all");
const filteredArgs = args.filter((a) => a !== "--all");

const projectDir = checkAll ? (filteredArgs[0] || ".") : null;
const docsDir = checkAll
  ? join(filteredArgs[0] || ".", ".ai", "docs")
  : (filteredArgs[0] || ".ai/docs");

let totalFiles = 0;
let totalBlocks = 0;
let errors = [];
let warnings = [];

function walkDir(dir) {
  let files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        files = files.concat(walkDir(full));
      } else {
        files.push(full);
      }
    }
  } catch {
    // directory doesn't exist
  }
  return files;
}

function validateToon(content, source) {
  try {
    decode(content, { strict: true });
    return null;
  } catch (e) {
    return { source, message: e.message };
  }
}

function extractToonBlocks(mdContent) {
  const blocks = [];
  const regex = /^```toon\s*\n([\s\S]*?)^```\s*$/gm;
  let match;
  let blockIndex = 0;
  while ((match = regex.exec(mdContent)) !== null) {
    blockIndex++;
    const content = match[1];
    // Calculate line number of this block
    const lineNum = mdContent.slice(0, match.index).split("\n").length;
    blocks.push({ content, blockIndex, lineNum });
  }
  return blocks;
}

// --- TOON Validation ---

// Collect all files
const allFiles = walkDir(docsDir);

// Validate .toon files
for (const file of allFiles.filter((f) => f.endsWith(".toon"))) {
  totalFiles++;
  const content = readFileSync(file, "utf-8");
  const rel = relative(process.cwd(), file);
  const err = validateToon(content, rel);
  if (err) {
    errors.push(err);
  } else {
    totalBlocks++;
  }
}

// Validate ```toon blocks in .md files
for (const file of allFiles.filter((f) => f.endsWith(".md"))) {
  const content = readFileSync(file, "utf-8");
  const rel = relative(process.cwd(), file);
  const blocks = extractToonBlocks(content);
  if (blocks.length > 0) {
    totalFiles++;
    for (const block of blocks) {
      totalBlocks++;
      const err = validateToon(
        block.content,
        `${rel}:${block.lineNum} (toon block #${block.blockIndex})`
      );
      if (err) {
        errors.push(err);
      }
    }
  }
}

// --- Tool Output Validation (--all mode) ---

if (checkAll && projectDir) {
  console.log("Checking tool-specific outputs...\n");

  const toolOutputs = [
    { path: "AGENTS.md", tool: "Universal (20+ tools)", required: true },
    { path: "CLAUDE.md", tool: "Claude Code", required: true },
    { path: ".ai/docs/index.toon", tool: "Claude Code (L1 index)", required: true },
    { path: ".cursor/rules/auto-docs.mdc", tool: "Cursor", required: false },
    { path: ".github/copilot-instructions.md", tool: "GitHub Copilot", required: false },
  ];

  for (const output of toolOutputs) {
    const fullPath = join(projectDir, output.path);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf-8").trim();
      if (content.length === 0) {
        errors.push({ source: output.path, message: `File exists but is empty (${output.tool})` });
      } else {
        console.log(`  ✓ ${output.path} (${output.tool}, ${content.length} chars)`);
      }
    } else if (output.required) {
      errors.push({ source: output.path, message: `Required file missing (${output.tool})` });
    } else {
      warnings.push({ source: output.path, message: `Optional file missing (${output.tool})` });
    }
  }

  console.log();
}

// --- Report ---

if (totalBlocks === 0 && !checkAll) {
  console.log(`No TOON content found in ${docsDir}`);
  process.exit(0);
}

if (totalBlocks > 0) {
  console.log(
    `Validated ${totalBlocks} TOON block(s) across ${totalFiles} file(s)\n`
  );
}

if (warnings.length > 0) {
  console.log(`${warnings.length} warning(s):\n`);
  for (const w of warnings) {
    console.log(`  WARN ${w.source}`);
    console.log(`    ${w.message}\n`);
  }
}

if (errors.length === 0) {
  console.log("All checks passed.");
} else {
  console.log(`Found ${errors.length} error(s):\n`);
  for (const err of errors) {
    console.log(`  ERROR in ${err.source}`);
    console.log(`    ${err.message}\n`);
  }
  process.exit(1);
}
