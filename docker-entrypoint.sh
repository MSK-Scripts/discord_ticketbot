#!/bin/sh
set -e

# =============================================================================
# Seeds the mounted config directory.
#
# Mounting ./config over /app/config hides the example files that ship with the
# image, so the bot's own "copy the example on first run" path finds nothing.
# The examples are therefore kept outside the mount, in /app/config-defaults,
# and copied in here whenever the real file is missing.
#
# Existing files are never touched: this must not overwrite a config someone
# has edited.
# =============================================================================

for example in /app/config-defaults/*.example.jsonc; do
  [ -e "$example" ] || continue

  base=$(basename "$example" .example.jsonc)
  target="/app/config/${base}.jsonc"

  if [ ! -e "$target" ]; then
    if cp "$example" "$target" 2>/dev/null; then
      echo "[entrypoint] created config/${base}.jsonc from the shipped example"
    else
      echo "[entrypoint] cannot write to /app/config. The mounted directory has to be"
      echo "[entrypoint] writable by uid 1000, for example: chown -R 1000:1000 config data"
      exit 1
    fi
  fi

  # The examples stay available inside the mount as well, so a reset does not
  # require pulling the image apart.
  cp -n "$example" "/app/config/$(basename "$example")" 2>/dev/null || true
done

if [ ! -w /app/data ]; then
  echo "[entrypoint] /app/data is not writable by uid 1000. SQLite cannot store its"
  echo "[entrypoint] database there. Try: chown -R 1000:1000 data"
  exit 1
fi

exec "$@"
