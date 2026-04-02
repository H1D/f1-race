# Generation Templates

Templates for each documentation file type. Replace `{{placeholders}}` with actual project values. Adapt structure to match the actual project — omit sections that don't apply, add sections that do.

---

## `index.toon` — L1 Feature Catalog

Always loaded via `@` import in CLAUDE.md. Keep under 200 tokens.

```toon
project: {{project-name}}
type: {{language/framework}}
framework: {{primary-framework}}
updated: {{YYYY-MM-DD}}

features[{{N}}]{name,path,status,layer}:
  {{feature-name}},.ai/docs/features/{{feature-name}}.md,{{stable|active|wip|deprecated}},{{frontend|backend|fullstack|infra}}
  ...

docs[{{N}}]{type,path}:
  architecture,.ai/docs/architecture.md
  decisions,.ai/docs/decisions.md
  dependencies,.ai/docs/dependencies.md
```

**Status values**: `stable` (rarely changes), `active` (under development), `wip` (incomplete), `deprecated` (being removed)

---

## `overview.md` — L2 Project Summary

```markdown
# {{Project Name}}

{{1-3 sentence description of what the project does and why it exists.}}

## Stack

` ` `toon
language: {{language}}
framework: {{framework}}
runtime: {{runtime}}
database: {{database}}
hosting: {{hosting-platform}}
package_manager: {{npm|yarn|pnpm|pip|cargo|...}}
` ` `

## Quick Start

` ` `bash
{{install and run commands}}
` ` `

## Project Structure

` ` `toon
dirs[{{N}}]{path,purpose}:
  {{path}},{{what it contains}}
  ...
` ` `

## Key Entry Points

- **App bootstrap**: `{{path}}`
- **Config**: `{{path}}`
- **Routes/API**: `{{path}}`
```

---

## `architecture.md` — L3 Component Map

```markdown
# Architecture

## Component Map

` ` `toon
components[{{N}}]{name,type,path,responsibility}:
  {{name}},{{service|controller|middleware|repository|model|util}},{{path}},{{what it does}}
  ...
` ` `

## Data Flow

{{Describe the primary request/data flow through the system. Use numbered steps.}}

1. {{step}}
2. {{step}}
...

## Patterns

- **{{Pattern name}}**: {{Brief description of how/where this pattern is used}}
- ...

## Boundaries

- **External APIs**: {{list external services and what they're used for}}
- **Database**: {{DB type, ORM/driver, migration approach}}
- **Auth boundary**: {{where auth is enforced}}
```

---

## `decisions.md` — L3 ADR Log

```markdown
# Decisions

` ` `toon
decisions[{{N}}]{id,date,title,status}:
  {{001}},{{YYYY-MM-DD}},{{Short title}},{{accepted|superseded|deprecated}}
  ...
` ` `

## ADR-{{001}}: {{Title}}

**Status**: {{accepted|superseded|deprecated}}
**Date**: {{YYYY-MM-DD}}
**Context**: {{Why was a decision needed?}}
**Decision**: {{What was decided?}}
**Consequences**: {{What follows from this decision?}}

---

{{Repeat for each decision}}
```

Only include decisions that are non-obvious or have meaningful trade-offs. Skip trivial choices.

---

## `dependencies.md` — L3 Dependency Map

```markdown
# Dependencies

## Runtime

` ` `toon
runtime[{{N}}]{name,version,purpose}:
  {{package}},{{version}},{{why it's used}}
  ...
` ` `

## Dev

` ` `toon
dev[{{N}}]{name,version,purpose}:
  {{package}},{{version}},{{why it's used}}
  ...
` ` `

## Internal Module Dependencies

` ` `toon
modules[{{N}}]{module,depends_on}:
  {{module-name}},{{comma-separated deps}}
  ...
` ` `

## External Services

` ` `toon
services[{{N}}]{name,type,used_by}:
  {{service}},{{api|database|cache|queue|storage}},{{which modules use it}}
  ...
` ` `
```

---

## `features/<name>.md` — L2 Feature Detail

```markdown
# {{Feature Name}}

{{2-3 sentence description of what this feature does.}}

` ` `toon
status: {{stable|active|wip|deprecated}}
owner: {{team or person, if known}}
depends_on[{{N}}]: {{feature1,feature2,...}}
entry_point: {{primary source file}}
test_cmd: {{command to run this feature's tests}}

routes[{{N}}]{method,path,handler,auth}:
  {{METHOD}},{{/api/path}},{{handlerName}},{{auth-type|none}}
  ...

files[{{N}}]{path,purpose}:
  {{file-path}},{{what this file does}}
  ...
` ` `

## Design Notes

- {{Key design decision or pattern used}}
- {{Why things are done this way}}

## Gotchas

- {{Non-obvious behavior or configuration}}
- {{Common mistakes when modifying this feature}}
```

---

## `AGENTS.md` — Universal (20+ tools)

The most important output file. Read by Codex, Gemini CLI, Jules, GitHub Copilot, Cursor, Windsurf, Aider, Roo Code, Kilo Code, Amp, OpenCode, and many more. Combine content from `.ai/docs/` into a single self-contained Markdown file. Keep under **4000 tokens**.

```markdown
# AGENTS.md

{{1-2 sentence project description.}}

## Commands

` ` `bash
{{package-manager}} run dev        # {{what it does}}
{{package-manager}} test           # {{what it does}}
{{build/lint commands}}
` ` `

After any code change, verify with: `{{type-check && test command}}`

## Architecture

{{2-3 sentence architecture summary from architecture.md}}

**Key components:**

| Component | Path | Responsibility |
|-----------|------|----------------|
| {{name}} | `{{path}}` | {{what it does}} |
| ... | ... | ... |

**Data flow:**
1. {{step}}
2. {{step}}

**Patterns:**
- **{{Pattern name}}**: {{brief description}}

## Key Rules

- {{Convention or constraint from the codebase}}
- {{Important pattern developers must follow}}
- {{Non-obvious gotcha}}

## Features

| Feature | Status | Key Files |
|---------|--------|-----------|
| {{name}} | {{stable/active}} | `{{primary file}}` |
| ... | ... | ... |

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `{{path}}/` | {{what it contains}} |
| ... | ... |
```

---

## `.cursor/rules/auto-docs.mdc` — Cursor

Cursor uses MDC (Markdown Component) files with YAML frontmatter. Content is the same as `AGENTS.md` body.

```
---
description: Project documentation generated by auto-docs
alwaysApply: true
---

{{Same content as AGENTS.md body}}
```

---

## `.github/copilot-instructions.md` — GitHub Copilot

Plain Markdown. Content is the same as `AGENTS.md` body. Create `.github/` directory if needed.

---

## Generation Guidelines

1. **Analyze before generating** — read `package.json`/`Cargo.toml`/`go.mod`, directory structure, README, existing CLAUDE.md or AGENTS.md, and key source files before writing any docs
2. **Feature identification** — a "feature" is a user-facing capability or bounded domain (auth, payments, search), not a technical layer (controllers, models)
3. **Be terse** — TOON values should be short. Use abbreviations where meaning is clear
4. **Omit unknowns** — if you can't determine a value from the codebase, omit that field rather than guessing
5. **Count accuracy** — `[N]` counts in TOON arrays must match the actual number of rows
6. **Path accuracy** — all file paths must be verified to exist in the project
7. **Adapt templates** — these are starting points. Add project-specific sections, remove irrelevant ones. A CLI tool won't have routes; a library won't have features in the same sense
8. **AGENTS.md is the priority** — this reaches the most tools. Make it comprehensive but concise
9. **Derive, don't duplicate** — write rich docs in `.ai/docs/` first, then condense into `AGENTS.md` and other tool files
