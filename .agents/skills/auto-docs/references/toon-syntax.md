# TOON Format Reference

TOON (Token-Oriented Object Notation) is a whitespace-structured data format optimized for LLM token efficiency — 40-60% fewer tokens than equivalent JSON.

## Core Rules

1. **No braces, no brackets, no quotes** (unless value contains delimiters)
2. **Indentation = nesting** (2 spaces per level)
3. **One key-value pair per line**: `key: value`
4. **Comments**: `# comment`

## Objects

Flat:
```toon
name: my-project
version: 1.0.0
type: node/typescript
```

Nested (indent 2 spaces):
```toon
database:
  host: localhost
  port: 5432
  name: mydb
```

## Key Folding

Dot notation flattens nested objects into single lines:
```toon
database.host: localhost
database.port: 5432
```

Equivalent to the nested form above. Use folding for 1-2 leaf values; use indentation for 3+.

## Tabular Arrays

Declare columns in the header, then one row per indented line:
```toon
routes[3]{method,path,handler,auth}:
  GET,/api/users,listUsers,jwt
  POST,/api/users,createUser,jwt
  DELETE,/api/users/:id,deleteUser,admin
```

Rules:
- `[N]` = row count (helps LLM pre-allocate; must match actual rows)
- `{col1,col2,...}` = column names
- Each indented line = one row, values comma-separated
- Column count per row must match header

## Primitive Arrays

Simple comma-separated values:
```toon
tags[3]: api,backend,typescript
depends_on[2]: auth,orders
```

## Quoting Rules

Only quote when a value contains a comma, colon, or leading/trailing whitespace:
```toon
description: "Routes: auth, payments"
simple_value: no quotes needed
path: src/index.ts
```

## Multi-line Values

Use `|` for multi-line text (each continuation line indented):
```toon
notes: |
  This is a longer description
  that spans multiple lines.
```

## Complete Example

```toon
project: shopwise-api
type: node/typescript
framework: express
updated: 2026-02-18

features[4]{name,path,status,layer}:
  auth,.ai/docs/features/auth.md,stable,backend
  products,.ai/docs/features/products.md,stable,backend
  orders,.ai/docs/features/orders.md,active,backend
  payments,.ai/docs/features/payments.md,active,backend

docs[3]{type,path}:
  architecture,.ai/docs/architecture.md
  decisions,.ai/docs/decisions.md
  dependencies,.ai/docs/dependencies.md
```

## Token Efficiency Tips

- Omit quotes unless required
- Use key folding for shallow nests
- Use tabular arrays instead of repeated objects
- Keep values terse — abbreviate where meaning is obvious
- Use `[N]` counts to help LLM parsing
