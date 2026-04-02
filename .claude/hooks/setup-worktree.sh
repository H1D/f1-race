#!/bin/bash
set -e

INPUT=$(cat)
WORKTREE_NAME=$(echo "$INPUT" | jq -r '.name')
BRANCH_NAME="$WORKTREE_NAME"
CWD=$(echo "$INPUT" | jq -r '.cwd')

WORKTREE_PATH="$CWD/.claude/worktrees/$WORKTREE_NAME"

git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" >&2
cd "$WORKTREE_PATH"

bun install --frozen-lockfile >/dev/null 2>&1 || bun install >/dev/null 2>&1

echo "$WORKTREE_PATH"
