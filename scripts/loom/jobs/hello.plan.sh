set -euo pipefail

cat > ORCHESTRATOR_HELLO.md <<'DOC'
# Hello from the orchestrator

This file was created inside an isolated git worktree by a coder station,
staged and captured as a diff, then gated by a test. It proves the
delivery loop runs end to end before any real slice rides on it.
DOC
