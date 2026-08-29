# syntax=docker/dockerfile:1

# =============================================================================
# MSK Ticket Bot
# -----------------------------------------------------------------------------
# Two stages so the build toolchain never reaches the published image.
#
# The base is Debian slim rather than Alpine on purpose: better-sqlite3 ships
# N-API prebuilds for glibc, and on musl npm would have to compile the native
# module on every build. The build toolchain is installed in the deps stage
# anyway, as a fallback for architectures without a prebuild.
# =============================================================================

FROM node:24-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Only the manifests, so this layer is cached until a dependency actually changes.
COPY package.json package-lock.json ./

# Optional dependencies are included deliberately: express and helmet are
# optional in package.json, but without them the web dashboard cannot start.
RUN npm ci --omit=dev


FROM node:24-bookworm-slim AS runtime

LABEL org.opencontainers.image.title="MSK Ticket Bot" \
      org.opencontainers.image.description="Self-hosted Discord ticket bot with HTML transcripts and a web dashboard" \
      org.opencontainers.image.url="https://www.msk-scripts.de/ticketbot" \
      org.opencontainers.image.documentation="https://docu.msk-scripts.de/discord/discord_ticketbot/getting-started/" \
      org.opencontainers.image.source="https://github.com/MSK-Scripts/discord_ticketbot" \
      org.opencontainers.image.licenses="AGPL-3.0-only"

ENV NODE_ENV=production

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Both directories are meant to be mounted. They are created here so the
# container also starts without a mount, and they belong to the unprivileged
# user because the bot writes its SQLite database into data/.
#
# The example configs are additionally kept outside the mount. A bind mount over
# /app/config hides everything the image shipped there, and the entrypoint needs
# a copy it can still reach.
#
# The chmod is not cosmetic. COPY carries the permission bits of the build host,
# and a checkout on Windows arrives as read-only directories (dr-xr-xr-x). The
# image would then run fine when built in CI on Linux and refuse to write its
# config when built on a developer machine.
RUN mkdir -p data config config-defaults \
 && cp config/*.example.jsonc config-defaults/ \
 && chmod +x docker-entrypoint.sh \
 && chown -R node:node /app \
 && chmod -R u+rwX /app

USER node

ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Only relevant when the dashboard runs (DASHBOARD_ENABLED=true). The plain bot
# listens on nothing at all.
EXPOSE 3010

# The plain bot, the same thing `npm start` does. For the web dashboard,
# override this with `node dashboard.js`, see docker-compose.yml.
CMD ["node", "index.js"]
