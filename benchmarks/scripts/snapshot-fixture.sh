#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <source-path> <class> <slug>"
  exit 1
fi

SOURCE_PATH="$1"
DOC_CLASS="$2"
SLUG="$3"

case "$DOC_CLASS" in
  discipline|guidance|collaborative|reference) ;;
  *)
    echo "Invalid class: $DOC_CLASS"
    echo "Allowed classes: discipline, guidance, collaborative, reference"
    exit 1
    ;;
esac

if [ ! -f "$SOURCE_PATH" ]; then
  echo "Source file not found: $SOURCE_PATH"
  exit 1
fi

TARGET_DIR="benchmarks/fixtures"
TARGET_PATH="$TARGET_DIR/$DOC_CLASS-$SLUG.md"
SNAPSHOT_DATE="$(date +%F)"
ORIGIN="$(basename "$(dirname "$SOURCE_PATH")")/$(basename "$SOURCE_PATH")"
SOURCE_CLASS="skill"

if [[ "$SOURCE_PATH" == */agents/* ]]; then
  SOURCE_CLASS="agent"
fi

mkdir -p "$TARGET_DIR"

cat > "$TARGET_PATH" <<EOF
<!--
  fixture: real-derived
  source-class: $SOURCE_CLASS
  origin: $ORIGIN
  snapshotted: $SNAPSHOT_DATE
  sanitized: yes
-->

EOF

cat "$SOURCE_PATH" >> "$TARGET_PATH"

echo "Created: $TARGET_PATH"
echo
echo "Manual sanitization required before commit:"
echo "  [ ] Remove machine-specific paths (~, /Users/...)"
echo "  [ ] Remove/neutralize private/internal URLs"
echo "  [ ] Remove credentials, tokens, and provider-specific model IDs"
echo "  [ ] Remove agent frontmatter model fields"
echo "  [ ] Keep structure intact (headings/lists/tables/code fences)"
echo "  [ ] Re-run verification (build/test/eval)"
