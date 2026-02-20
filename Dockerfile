# PianoAI — lightweight production image
# Runs the MCP server (stdio) or CLI
#
# Build:  docker build -t pianoai .
# MCP:    docker run --rm -i pianoai
# CLI:    docker run --rm pianoai pianai list
# Play:   docker run --rm --device /dev/snd pianoai pianai play let-it-be

FROM node:22-slim AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ src/

RUN pnpm build

# --- Production stage ---
FROM node:22-slim

LABEL org.opencontainers.image.title="PianoAI"
LABEL org.opencontainers.image.description="MCP server + CLI for AI-powered piano teaching"
LABEL org.opencontainers.image.source="https://github.com/mcp-tool-shop-org/pianoai"
LABEL org.opencontainers.image.license="MIT"

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist/ dist/
COPY logo.svg README.md LICENSE ./

# Default: run MCP server (stdio transport)
ENTRYPOINT ["node", "dist/mcp-server.js"]
