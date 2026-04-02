#!/bin/bash
set -e

INPUT=$(cat)
WORKTREE_NAME=$(echo "$INPUT" | jq -r '.worktree_name')
BRANCH_NAME=$(echo "$INPUT" | jq -r '.branch_name')
CWD=$(echo "$INPUT" | jq -r '.cwd')

WORKTREE_PATH="$CWD/.claude/worktrees/$WORKTREE_NAME"

git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"
cd "$WORKTREE_PATH"

bun install --frozen-lockfile 2>/dev/null || bun install

echo "$WORKTREE_PATH"
