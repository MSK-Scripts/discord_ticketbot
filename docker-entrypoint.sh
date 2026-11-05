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

# Shipped default panel images. assets/ is usually a mount for uploaded images,
# which hides what the image shipped there. The defaults are copied in on every
# start, so an image update also updates them. Only assets/default/ is written;
# uploaded and customer images elsewhere in assets/ are never touched.
if ! { mkdir -p /app/assets/default && cp -r /app/assets-defaults/. /app/assets/default/; } 2>/dev/null; then
  echo "[entrypoint] /app/assets is not writable by uid 1000. Uploaded panel images"
  echo "[entrypoint] cannot be stored there. Try: chown -R 1000:1000 assets"
  exit 1
fi

if [ ! -w /app/locales/custom ]; then
  echo "[entrypoint] /app/locales/custom is not writable by uid 1000. Locale texts"
  echo "[entrypoint] changed in the dashboard cannot be saved. Try: chown -R 1000:1000 locales-custom"
  exit 1
fi

exec "$@"
